const nuki = require("nuki-api"),
      ical = require("ical-booking"),
      schedule = require("node-schedule"),
      Log = require('log'),
      fs = require('fs'),
      nodemailer = require('nodemailer'),
      models = require('./models'),
      dir = __dirname,
      log = new Log('debug', fs.createWriteStream(dir + '/nuki-ical.log'));

let settings = new models.settings({});
let smartlocks = [];
let interval;

function filterGrant(item) {
    let today = new Date();
    let hoursBeforeBooking = settings.hoursBeforeBooking;
    let next36Hours = new Date().setTime(today.getTime() + (1000*60*60*hoursBeforeBooking));
    return item.dStart >= today && item.dStart <= next36Hours && item.property != null;
};
function filterRevoke(item) {
    let today = new Date();
    return item.dEnd < today;
};

function processBookings(bookings) {
    var grant = bookings.filter(filterGrant).sort(function (a, b) { return (a.dStart > b.dStart) ? 1 : 0 });
    var revoke = bookings.filter(filterRevoke).sort(function (a, b) { return (a.dStart > b.dStart) ? 1 : 0 });


    for(let key in grant) {
        grantAccess(grant[key]);
    };
    let bookingString = grant.map(function (i) {
        return i.name;
    }).join(', ');
    log.debug("Users to grant access: " + bookingString);

    nuki.getSmartLockUsers(settings.smartlockId).then(function (users) {
        let remove = [];
        for(let key in revoke) {
            let data = users.filter(function (item) {
                return item.name == revoke[key].name;
            });
            if(data.length == 0) {
                remove.push(revoke[key]);
            }
        };

        for(let key in remove) {
            let index = revoke.indexOf(remove[key]);
            revoke.splice(index, 1);
        };

        for(let key in revoke) {
            revokeAccess(revoke[key]);
        };

        let removeString = revoke.map(function (i) {
                return i.name;
            }).join(', ');
            log.debug("Users to remove: " + removeString);
        
        sendMail(bookingString, removeString);
    });
    
    function sendMail(bookingString, removeString) {
        let stream = fs.createReadStream(dir + '/nuki-ical.log'),
            read = new Log('debug', stream),
            text = "",
            html = "<ul>",
            today = new Date().setHours(0,0,0,0);

        read.on('line', function(line){
            var bDate = new Date(line.date).setHours(0,0,0,0)
            if (today == bDate) {
                text += line.date + ' ' + line.levelString + ' ' + line.msg + '\n';
                html += "<li>" + line.date + ' ' + line.levelString + ' ' + line.msg + '</li>';
            };
        });
        stream.on('error', function(err){
            notify(err, err);
        });
        stream.on('close', function()
        {
            let textString = 'New: ' + bookingString + '\n' + 'Remove: ' + removeString + '\n' + text;
            let htmlString = '<p>New: ' + bookingString + '</p><p>' + 'Remove: ' + removeString + '</p><p>' + html + '</p>';
            if(!settings.onlyNotifyOnChanges) {
                notify(textString, htmlString);
            } else if(bookings.length > 0 || revoke.length > 0) {
                notify(textString, htmlString);
            };
        });
    };
};

function grantAccess(booking) {
    let user = new nuki.models.AccountUser({
        name: booking.name,
        email: 'gijssegerink@gmail.com'//(booking.email == null) ? settings.defaultEmail : booking.email
    });
    nuki.createNukiUser(user).then(function (name) {
        let user = nuki.findAccountUserByName(name);
        let auth = new nuki.models.SmartlockAuth({
            accountUserId: user.accountUserId,
            name: booking.name,
            remoteAllowed: settings.remoteAllowed,
            allowedFromDate: booking.dStart,
            allowedUntilDate: booking.dEnd,
            allowedFromTime: settings.checkIn,
            allowedUntilTime: settings.checkOut
        });
        nuki.grantAccess(auth).then(function (data) {

        }).catch(function(error) {
            log.error('Fail to grant access for user ' + booking.name + ' : ' + error);
        })
    }).catch(function (error) {
        log.error('Fail to create user ' + booking.name + ' : ' + error);
    })
};
function revokeAccess(booking) {
    let user = new nuki.models.AccountUser({
        name: booking.name,
        email: (booking.email == null) ? settings.defaultEmail : booking.email
    });
    nuki.revokeAccess()
    nuki.createNukiUser(user).then(function (name) {
        let user = nuki.findAccountUserByName(name);
        let auth = new nuki.models.SmartlockAuth({
            accountUserId: user.accountUserId,
            name: booking.name,
            remoteAllowed: settings.remoteAllowed,
            allowedFromDate: booking.dStart,
            allowedUntilDate: booking.dEnd,
            allowedFromTime: settings.checkIn,
            allowedUntilTime: settings.checkOut
        });
        nuki.grantAccess(auth).then(function (data) {

        }).catch(function(error) {
            log.error('Fail to grant access for user ' + booking.name + ' : ' + error);
        })
    }).catch(function (error) {
        log.error('Fail to create user ' + booking.name + ' : ' + error);
    })
};
function notify(text, html) {
    let transporter = nodemailer.createTransport(settings.smtp);

    let message = {
        from: 'info@intelligencecompany.net',
        // Comma separated list of recipients
        to: settings.defaultEmail,

        // Subject of the message
        subject: 'LOG Nuki-ical', //

        // plaintext body
        text: text,

        // HTML body
        html: html,

        // Apple Watch specific HTML body
        watchHtml: '<b>Nuki-ical</b>',

        // An array of attachments
        attachments: [
            {
                filename: 'nuki-ical.log',
                path: dir + '/nuki-ical.log'
            }
        ]
    };

    transporter.sendMail(message, function (error, info) {
        if(error != null)
            log.error(error);
        log.debug(info);
    });
}


module.exports = {
    models: models,

    findSmartLockByName: function (name) {
        return nuki.findSmartlockByName(name);
    },

    addCalendar: function (calendar) {
        return ical.importICal(calendar);
    },

    readSettings: function (smartlockId = null) {
        return new Promise(function (resolve, reject) {
            fs.readFile(dir + "/settings.json", (error, data) => {
                if(error != null)
                    return reject(error);
                
                if(JSON.parse(data).length > 0 && smartlockId != null) {
                    settings = JSON.parse(data).filter(function (lock) {
                        return lock.smartlockId == smartlockId;
                    })[0];
                } else {
                    settings = JSON.parse(data)[0];
                };

                if(settings == null) {
                    log.error('No smartlocks found!');
                    return reject("No smartlocks found!")
                };
                nuki.setApiKey(settings.nukiApiKey);
                return resolve(settings);
            });
        });
    },
    writeSettings: function (setting) {
        return new Promise(function (resolve, reject) {
            fs.readFile(dir + "/settings.json", (error, data) => {
                let json = JSON.parse(data);
                if(json == null)
                    json = [];

                var exists = json.filter(function (item) {
                    return item.smartlockId == setting.smartlockId;
                });
                if(exists.length == 0) {
                    saveSetting(setting);
                } else {
                    module.exports.removeSettings(setting.smartlockId).then(function () {
                        fs.readFile(dir + "/settings.json", (error, data) => {
                            json = JSON.parse(data);
                            if(json == null)
                                json = [];
                            saveSetting(setting);
                        })
                    }).catch(function (error) {
                        reject(error);
                    });
                };

                function saveSetting(setting) {
                    json.push(setting);
                    fs.writeFile(dir + "/settings.json", JSON.stringify(json), (error) => {
                        if(error != null)
                            return reject(error);
                        settings = setting;
                        nuki.setApiKey(settings.nukiApiKey);
                        return resolve();
                    });
                };
            });
        });
    },
    removeSettings: function (smartlockId) {
        return new Promise(function (resolve, reject) {
            fs.readFile(dir + "/settings.json", (error, data) => {
                if(error != null)
                    return reject(error);

                let json = JSON.parse(data);
                if(json == null)
                    json = [];

                let exists = json.filter(function (item) {
                    return item.smartlockId == smartlockId;
                });

                for(let key in exists) {
                    let index = json.indexOf(exists[key]);
                    json.splice(index, 1);
                };

                fs.writeFile(dir + "/settings.json", JSON.stringify(json), (error) => {
                    if(error != null)
                        return reject(error);
                    return resolve();
                });
            });
        });
    },

    start: function (smartlockId = null) {
        let rule = new schedule.RecurrenceRule();
        switch(settings.interval) {
            case models.interval.MINUTE:
                rule.second = 1;
                break;
            case models.interval.HOURLY:
                rule.minute = 1;
                break;
            case models.interval.DAILY:
                rule.hour = 1;
                break;
            case models.interval.WEEKLY:
                rule.dayOfWeek = 1;
                break;
            case models.interval.MONTHLY:
                rule.date = 1;
                break;
            default:
                rule.hour = 1;
                break;
        };

        //interval = schedule.scheduleJob(rule, () => {  
            log.debug('Starting run...');
            module.exports.readSettings(smartlockId).then(function (setting) {
                ical.getICals().then(function (calendars) {
                    for(let key in calendars) {
                        ical.getICalToJSON(calendars[key]).then(function (bookings) {
                            processBookings(bookings);
                        }).catch(function (error) {
                            log.error(error);
                        });
                    };
                });
            }).catch(function(error) {
                log.error(error);
                console.log(error);
            });
            log.debug('Finished run...');
        //});
    },
    stop: function () {
        interval.stop();
    },
    restart: function () {
        interval.stop();
        module.exports.start();
    }
};