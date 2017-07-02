let cal = require("ical-booking");

module.exports = {
    icalmodels: cal.models,
    interval: {
        MINUTE: 0,
        HOURLY: 1,
        DAILY: 2,
        WEEKLY: 3,
        MONTHLY: 4
    },
    settings: function (i) {
        return {
            "defaultEmail": i.defaultEmail,
            "smartlockId": i.smartlockId,
            "smtp": {
                "service": (i.smtp != null) ? i.smtp.service : null,
                "auth": {
                    "user": (i.smtp != null) ? i.smtp.auth.user : null,
                    "pass": (i.smtp != null) ? i.smtp.auth.pass : null
                }
            },
            "nukiApiKey": i.nukiApiKey,
            "interval": i.interval,
            "hoursBeforeBooking": (i.hoursBeforeBooking == null) ? 36 : i.hoursBeforeBooking,
            "onlyNotifyOnChanges": (i.onlyNotifyOnChanges == null) ? false : i.onlyNotifyOnChanges,
            "checkIn": (i.checkIn == null) ? 15 * 60 : i.checkIn,
            "checkOut": (i.checkOut == null) ? 11 * 60 : i.checkOut,
            "remoteAllowed": (i.remoteAllowed == null) ? false : i.remoteAllowed,
        }
    }
}