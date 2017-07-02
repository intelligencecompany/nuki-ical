#Nuki-iCal

## Synopsis

This package can be used with the NUKI Smartlock Web Api - https://api.nuki.io and internet calendars like AirBnB. Get notified by email when an user is granted or revoked acces.

npm install nuki-ical

## Code Example
``` js
const nuki = require('nuki-ical');

let settings = new nuki.models.settings({
    defaultEmail: 'gijs@intelligencecompany.net',
    smartlockId: 000000000,
    interval: nuki.models.interval.MINUTE,
    smtp: {
        service: 'Gmail',
        auth: {
            user: 'info@intelligencecompany.net',
            pass: 'xxxxxxxxxxxxxxxxxxxxx'
        }
    },
    nukiApiKey: 'xxxxxxxxxxxxxxxxxxxxx'   
});

let calendar = new nuki.models.icalmodels.ICal({
    url: "https://www.airbnb.nl/calendar/ical/xxxxxxxxxxxxxxxxxxxxxxx",
    type: nuki.models.icalmodels.ICalTypes.AIRBNB,
    name: 'AirBnB'
};

ical.writeSettings(settings).then(function () {
    ical.findSmartLockByName('xxx').then(function (smartlock) {
        ical.addCalendar(calendar).then(function () {
            ical.start(); // Start the application.
        }).catch(function (error) {
            console.log(error);
        });
    });
});
```

## Motivation

This package was initially build to integrate the NUKI Smartlock with AirBnB, Booking.com, HomeAway and other internet calendars. Other relevant and depending packages are:
1. [ical-booking](https://www.npmjs.com/package/ical-booking) 
2. [nuki-api](https://www.npmjs.com/package/nuki-api)

## API Reference

Get your API-key from https://web.nuki.io/nl/#/admin/web-api

Request                     | Parameters 
--------------------------- | -----------------------------------------------------------------------
findSmartlockByName         | (string) name
addCalendar                 | (models.icalmodels.ICal) icalendar
readSettings                | (int) smartlockId (optional)
writeSettings               | (models.settings) settings
removeSettings              | (int) smartlockId
start                       | (int) smartlockId (optional)
stop                        | 
restart                     | 

## Contributors

If you want to contribute or donate to the project, please contact me on gijs@intelligencecompany.net.

## License

MIT licence.