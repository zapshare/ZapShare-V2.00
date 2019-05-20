console.log("file loaded success");
var bookingObj;
var successful = false;
function addEventListenerOnAccept(element, booking, jwt) {
    element.click(event => {
        bookingObj = booking;
        confirmationPopup("accept", booking);

    })
}

function addEventListenerOnReject(element, booking, jwt) {
    element.click(event => {
        bookingObj = booking;
        confirmationPopup("decline", booking);


    })
}

function confirmationPopup(value, charger) {
    createPopup();
    createPopupHeader("h3", "Do you wish to confirm the request for</br><b id='confirm-charger-name'>" + charger.chargername + "</b>"
        + " on <b id='confirm-charger-date'>" + charger.startTime.split("T")[0] + "</b>"
        + "</br>at <b id='confirm-charger-stime'>" + getTime(charger.startTime) + "-</b>"
        + "<b>" + getTime(charger.endTime) + "</b>", "confirm-popup-subheader", "popup-header");
    createPopupConfirmButton(value + "-btn", value);
    createPopupCancelButton("popup-cancel", "Back");


}
//fetch call if user confirmed to accept the request
$('body').on("click", "#accept-btn", (e) => {
    //setting all require info to make a request
    var url = '/booking/acceptBooking';
    const dataToSend = {
        bUID: bookingObj.bookingID
    }
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(dataToSend),
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + jwt
        }
    }).then(res => {
        console.log(res)
        if (res.status == 200)
            successful = true;
    })
        .then((response) => {
            //to be remove
            successful = true;
            //////////////////
            if (successful) {
                $("#popup").children().remove();
                createPopupHeader("h3", "You've accepted the booking!", "confirm-popup-header", "popup-header");
                $('body').on("click", (e) => {
                    location.reload(true);
                })

            } else {
                //if we recieve status for 404/400/500 

            }

        })
        .catch(error => console.error(error));
});

//fetch call if user confirmed to decline the request
$('body').on("click", "#decline-btn", (e) => {

    //setting all require info to make a request
    const dataToSend = {
        bUID: bookingObj.bookingID
    }

    fetch('booking/declineBooking', {
        method: 'DELETE',
        body: JSON.stringify(dataToSend),
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + jwt
        }
    }).then(res => {
        console.log(res)
        if (res.status == 200) {
            successful == true;
        }
    }).then((data) => {
        //to be remove
        successful = true;
        //////////////////
        if (successful) {
            $("#popup").children().remove();
            createPopupHeader("h3", "You've decline the booking!", "confirm-popup-header", "popup-header");
            $('body').on("click", (e) => {
                location.reload(true);
            })

        } else {
            //if we recieve status for 404/400/500 
        }

    }).catch(error => console.error(error));
});

// Removes popup for booking
$('body').on("click", "#popup-cancel, #popup-finish", (e) => {
    if (e.target.id == "popup-cancel" || e.target.id == "popup-finish") {
        $("#popup-wrapper").remove();
    }
});