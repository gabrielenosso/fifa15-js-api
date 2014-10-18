(function () {
    // Modules
    var events  = require('events'),     // Module to manage Events
        request = require('request');    // Module to manage HTTP/HTTPS requests

    // Vars
    var callback,                                  // The function to invoke when the login is completed
        eventEmitter = new events.EventEmitter(),  // The Events Emitter (events management)
        loginDetails,                              // Stores login details
        nucleusId,                                 // ID used by FUT
        phishingToken,                             // Phishing token
        sessionId,                                 // Session ID
        urls,                                      // Set of URLs to request
        userAccounts;                              // Object that stores user accounts info

    // Returns the Nucleus Platform (a parameter to be sent in some requests)
    function getNucleusPlatform(platform) {
        if (platform === 'XBOX') {
            return '360';
        } else {
            return 'PS3';
        }
    }

    // Set default values for requests
    request = request.defaults({
        jar: true,
        followAllRedirects: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36'
        }
    });

    // Set URLs
    urls = {
        main:     'https://www.easports.com/fifa/ultimate-team/web-app',
        nucleus:  'https://www.easports.com/iframe/fut15/?baseShowoffUrl=https%3A%2F%2Fwww.easports.com%2Ffifa%2Fultimate-team%2Fweb-app%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Ffifa%2Fultimate-team%2Fweb-app&locale=en_US',
        shards:   'https://www.easports.com/iframe/fut15/p/ut/shards?_=',
        userinfo: 'https://www.easports.com/iframe/fut15/p/ut/game/fifa15/user/accountinfo?sku=FUT15WEB&_=',
        session:  'https://www.easports.com/iframe/fut15/p/ut/auth',
        phishing: 'https://www.easports.com/iframe/fut15/p/ut/game/fifa14/phishing/question?_=',
        validate: 'https://www.easports.com/iframe/fut15/p/ut/game/fifa15/phishing/validate'
    };

    // 1 - main
    eventEmitter.on('app.start', function () {
        process.stdout.write('logging');
        request(urls.main, function (error, response, body) {
            var url; // Current url
            if (!error && response.statusCode == 200) {
                url = response.request.host + response.request.path;
                // Get the protocol
                if (response.request.port === 80) {
                    url = 'http://' + url;
                } else {
                    url = 'https://' + url;
                }
                
                eventEmitter.emit('main.completed', url);
            } else {
                console.log('Error with main: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 2 - login
    eventEmitter.on('main.completed', function (url) {
        process.stdout.write('.');
        request.post(url, {
            form: {
                'email': loginDetails['email'],
                'password': loginDetails['password'],
                '_rememberMe': 'on',
                'rememberMe': 'on',
                '_eventId': 'submit',
                'facebookAuth': ''
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                eventEmitter.emit('login.completed');
            } else {
                console.log('Error with login: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 3 - nucleus
    eventEmitter.on('login.completed', function () {
        process.stdout.write('.');
        request(urls.nucleus, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                nucleusId = body.match(/var\ EASW_ID = '(\d*)';/)[1]; // Get nucleus id
                eventEmitter.emit('nucleus.completed');
            } else {
                console.log('Error with nucleus: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 4 - shards
    eventEmitter.on('nucleus.completed', function () {
        process.stdout.write('.');
        request({
            url: urls.shards,
            headers: {
                'Easw-Session-Data-Nucleus-Id': nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': 'https://utas.fut.ea.com',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript',
                'Accept-Language': 'en-US,en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                eventEmitter.emit('shards.completed');
            } else {
                console.log('Error with shards: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 5 - accounts
    eventEmitter.on('shards.completed', function () {
        // Get route
        if (loginDetails.platform === 'XBOX') {
            loginDetails.route = 'https://utas.fut.ea.com:443';    // XBOX
        } else {
            loginDetails.route = 'https://utas.s2.fut.ea.com:443'; // PS
        }

        process.stdout.write('.');
        request({
            url: urls.userinfo,
            headers: {
                'Easw-Session-Data-Nucleus-Id': nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': loginDetails.route,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript',
                'Accept-Language': 'en-US,en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                userAccounts = JSON.parse(body); // Save user accounts
                eventEmitter.emit('accounts.completed');
            } else {
                console.log('Error with accounts: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 6 - session
    eventEmitter.on('accounts.completed', function () {
        var dataString,           // String to be sent as the message of the POST request
            personaId,            // ID of the persona
            personaName,          // Name of the persona
            platform;             // Name of the console (or pc)
            
        // Get persona info
        personaId   = userAccounts['userAccountInfo']['personas'][0]['personaId'];
        personaName = userAccounts['userAccountInfo']['personas'][0]['personaName'];
        platform    = getNucleusPlatform(loginDetails.platform);

        // Create data string to send with POST request
        dataString = JSON.stringify({
            'isReadOnly': false,
            'sku': 'FUT15WEB',
            'clientVersion': 1,
            'nuc': nucleusId,
            'nucleusPersonaId': personaId,
            'nucleusPersonaDisplayName': personaName,
            'nucleusPersonaPlatform': platform,
            'locale': 'en-GB',
            'method': 'authcode',
            'priorityLevel': 4,
            'identification': {'authCode': ''}
        });

        process.stdout.write('.');
        request.post(urls.session, {
            body: dataString,
            json: true,
            headers: {
                'Easw-Session-Data-Nucleus-Id': nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': loginDetails.route,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-US:en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB',
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                sessionId = body.sid; // Get Session ID
                eventEmitter.emit('session.completed');
            } else {
                console.log('Error with session: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 7 - phishing
    eventEmitter.on('session.completed', function () {
        process.stdout.write('.');
        request({
            url: urls.phishing,
            json: true,
            headers: {
                'Easw-Session-Data-Nucleus-Id': nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': loginDetails.route,
                'X-UT-SID': sessionId,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-US:en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // Check if phishing is validated
                if (typeof body.debug !== 'undefined' && body.debug === "Already answered question.") {
                    phishingToken = body.token;
                    eventEmitter.emit('validate.completed'); // Login is completed
                } else {
                    eventEmitter.emit('phishing.completed'); // Validation is needed to complete login
                }
                
            } else {
                console.log('Error with phishing: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 8 - validate
    eventEmitter.on('phishing.completed', function () {
        var dataString;           // String to be sent as the message of the POST request

        dataString = 'answer=' + loginDetails.hash; // Set POST data (hashed answer)

        process.stdout.write('.');
        request.post({
            url: urls.validate,
            body: dataString,
            headers: {
                'X-UT-SID': sessionId,
                'X-UT-Route': loginDetails.route,
                'Easw-Session-Data-Nucleus-Id': nucleusId,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error) {
                phishingToken = JSON.parse(body).token;
                eventEmitter.emit('validate.completed'); // Login is completed
            } else {
                console.log('Error with validate: ' + error + ' - ' + response.statusCode);
                eventEmitter.emit('error');
            }
        })
    });

    // 9 - return the login response
    eventEmitter.on('validate.completed', function () {
        console.log('success!');

        // Invoke the callback, passing the object with login session info
        callback({
            'nucleusId': nucleusId,
            'userAccounts': userAccounts,
            'sessionId': sessionId,
            'phishingToken': phishingToken,
            'platform': loginDetails.platform
        });
    });

    // The function to run to start the login process
    function login (localLoginDetails, localCallback) {
        // Save Login Details in the shared variable
        loginDetails = localLoginDetails;

        // Save the passed callback in the shared variable
        callback = localCallback;

        // On error, restart the app
        eventEmitter.on('error', function () {
            setTimeout(function () {
                eventEmitter.emit('app.start');
            }, 2000);
        });

        // Start the app
        eventEmitter.emit('app.start');
    }

    // Export the module
    module.exports = login;
}());