// Imports
const express = require('express')
const Booking = require('../models/booking')
const Charger = require('../models/charger')
const Notification = require('../models/notification')
const router = new express.Router()
const auth = require('../middleware/auth')
const CronJob = require('cron').CronJob;

//Marks past paid bookings as completed and deletes past pending bookings
const updateCompleted = new CronJob('0 0 * * *', async function () {
    try {
        console.log("booking maintenance")
        await Booking.updateMany({ timeStart: { $lte: Date.now() }, state: "PAID" }, { $set: { state: 'COMPLETED' } });
        await Booking.deleteMany({ timeStart: { $lte: Date.now() }, state: "PENDING" });
    } catch (error) {
        console.log(error)
    }
})
updateCompleted.start();

// Creates a new booking from booking information
router.post('/newBooking', auth, async (req, res) => {
    try {
        //create new booking
        const booking = new Booking(req.body)
        booking.client = req.user._id
        let charger = await Charger.findById(booking.charger);
        booking.cost = (charger.cost * (booking.timeEnd - booking.timeStart) * (25 / 9) * 1e-7).toFixed(2);
        await booking.save()
        //create new notification (notify a charger owner that a request has been sent to the corresponding charger)
        let notification = new Notification({
            booking: booking,
            user: charger.owner,
            type: 'NEWREQ',
            read: false
        })

        await notification.save()

        res.status(201).send(booking)
    } catch (error) {
        res.status(400).send(error)
    }
})

//Accepts a booking
router.post('/acceptBooking', auth, async (req, res) => {
    try {
        //booking status update(from pending to unpaid)
        const booking = await Booking.findByIdAndUpdate(req.body.bUID, { state: "UNPAID" });
        //notify user that their request for the charger has been accepted
        let notification = new Notification({
            booking: booking,
            user: booking.client,
            type: 'ACCEPTED',
            read: false
        })
        await notification.save()

        res.send(booking);
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
})

//Declines a booking
router.delete('/declineBooking', async (req, res) => {
    try {
        //booking remove
        const booking = await Booking.findByIdAndRemove(req.body.bUID);
        if (!booking) {
            console.log("Booking not found, could not delete.")
            return res.status(404).send("not found")
        } else {
            //notify user that their request for the charger has been declined
            let notification = new Notification({
                booking: booking,
                user: booking.client,
                type: 'DECLINED',
                read: false
            })
            await notification.save()
        }
        res.send(booking)
    } catch (error) {
        res.status(500).send()
    }
})

//Pays for a booking
router.post('/payBooking', auth, async (req, res) => {
    try {
        //status changed from unpaid to paid
        const booking = await Booking.findByIdAndUpdate(req.body.bUID, { state: "PAID" });
        const charger = await Charger.findById(booking.charger);
        //notify charger owner that a payment has been received
        let notification = new Notification({
            booking: booking,
            user: charger.owner,
            type: 'PAID',
            read: false
        })
        await notification.save()
        res.send(notification);
    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
})

//Cancels a booking
router.delete('/cancelBooking', async (req, res) => {
    try {
        //remove booking
        const booking = await Booking.findByIdAndRemove(req.bUID);
        const charger = await Charger.findById(booking.charger);
        if (!booking) {
            console.log("Booking not found, could not cancel.")
            return res.status(400).send()

        } else if (booking.state == "PAID") {
            await booking.save()
            console.log("Could not cancel booking, already paid.")
            return res.status(500).send()

        } else {
            //notify charger owner that a pending request has been cancelled
            let notificationClient = new Notification({
                booking: booking,
                user: booking.client,
                type: 'CANCELLED',
                read: false
            })
            await notificationClient.save()

            let notificationHost = new Notification({
                booking: booking,
                user: charger.owner,
                type: 'CANCELLED',
                read: false
            })
            await notificationHost.save()
        }
        res.send(booking)
    } catch (error) {
        res.status(500).send()
    }
})
// Updates a booking
router.patch('/bookings/:id', auth, async (req, res) => {
    // Specifies what is allowed to be updated in the db
    const updates = Object.keys(req.body)
    const allowedUpdates = ['accepted']
    const isValidOperation = updates.every((update) => {
        return allowedUpdates.includes(update)
    })

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        // req.body lets us access the data from front-end. new: true lets us get the updated user back.
        const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

        // If no booking is found.
        if (!booking) {
            return res.status(404).send()
        }

        // Sends back the found booking data back after updating it
        res.send(booking)

    } catch (error) {
        res.status(400).send(error)
    }
})

module.exports = router