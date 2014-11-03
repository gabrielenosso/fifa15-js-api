(function () {
    // Modules
    var events  = require('events'),     // Module to manage Events
        request = require('request'),    // Module to manage HTTP/HTTPS requests

    // Vars
        urls;                                      // Set of URLs to request

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

    // Constructor
    function login() {
        var self = this;    // Own reference

        // Create an own Events Emitter (events management)
        self.eventEmitter = new events.EventEmitter();
    }

    // 1 - main
    login.prototype.main = function () {
        var self = this;    // Own reference

        process.stdout.write('logging');

        request({
            url: urls.main,
            jar: self.jar
        }, function (error, response, body) {
            var url; // Current url
            if (!error && response.statusCode == 200) {
                url = response.request.host + response.request.path;
                // Get the protocol
                if (response.request.port === 80) {
                    url = 'http://' + url;
                } else {
                    url = 'https://' + url;
                }

                self.loginForm(url);
            } else {
                console.log('Error with main: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 2 - login form
    login.prototype.loginForm = function (url) {
        var self = this;    // Own reference

        process.stdout.write('.');

        request.post({
            url: url,
            jar: self.jar,
            form: {
                'email': self.loginDetails.email,
                'password': self.loginDetails.password,
                '_rememberMe': 'on',
                'rememberMe': 'on',
                '_eventId': 'submit',
                'facebookAuth': ''
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                self.nucleus();
            } else {
                console.log('Error with login: ' + error);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 3 - nucleus
   login.prototype.nucleus = function () {
    var self = this;    // Own reference

        process.stdout.write('.');

        request({
            url: urls.nucleus,
            jar: self.jar
        }, function (error, response, body) {
            var bodyMatch;
            if (!error && response.statusCode == 200) {
                bodyMatch = body.match(/var\ EASW_ID = '(\d*)';/);
                if (bodyMatch === null) {
                    console.log('Nucleus response not as expected.');
                    self.eventEmitter.emit('error');
                } else {
                    self.nucleusId = body.match(/var\ EASW_ID = '(\d*)';/)[1]; // Get nucleus id
                    self.shards();
                }
            } else {
                console.log('Error with nucleus: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 4 - shards
    login.prototype.shards = function () {
        var self = this;    // Own reference

        process.stdout.write('.');

        request({
            url: urls.shards,
            jar: self.jar,
            headers: {
                'Easw-Session-Data-Nucleus-Id': self.nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': 'https://utas.fut.ea.com',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript',
                'Accept-Language': 'en-US,en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                self.accounts();
            } else {
                console.log('Error with shards: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 5 - accounts
    login.prototype.accounts = function () {
        var self = this;    // Own reference

        // Get route
        if (self.loginDetails.platform === 'XBOX') {
            self.loginDetails.route = 'https://utas.fut.ea.com:443';    // XBOX
        } else {
            self.loginDetails.route = 'https://utas.s2.fut.ea.com:443'; // PS
        }

        process.stdout.write('.');
        request({
            url: urls.userinfo,
            jar: self.jar,
            headers: {
                'Easw-Session-Data-Nucleus-Id': self.nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': self.loginDetails.route,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript',
                'Accept-Language': 'en-US,en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                self.userAccounts = JSON.parse(body); // Save user accounts
                self.session();
            } else {
                console.log('Error with accounts: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 6 - session
    login.prototype.session = function () {
        var self = this,          // Own reference
            dataString,           // String to be sent as the message of the POST request
            personaId,            // ID of the persona
            personaName,          // Name of the persona
            platform;             // Name of the console (or pc)
            
        // Get persona info
        personaId   = self.userAccounts.userAccountInfo.personas[0].personaId;
        personaName = self.userAccounts.userAccountInfo.personas[0].personaName;
        platform    = getNucleusPlatform(self.loginDetails.platform);

        // Create data string to send with POST request
        dataString = JSON.stringify({
            'isReadOnly': false,
            'sku': 'FUT15WEB',
            'clientVersion': 1,
            'nuc': self.nucleusId,
            'nucleusPersonaId': personaId,
            'nucleusPersonaDisplayName': personaName,
            'nucleusPersonaPlatform': platform,
            'locale': 'en-GB',
            'method': 'authcode',
            'priorityLevel': 4,
            'identification': {'authCode': ''}
        });

        process.stdout.write('.');
        request.post({
            url: urls.session,
            jar: self.jar,
            body: dataString,
            json: true,
            headers: {
                'Easw-Session-Data-Nucleus-Id': self.nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': self.loginDetails.route,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-US:en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB',
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                self.sessionId = body.sid; // Get Session ID
                self.phishing();
            } else {
                console.log('Error with session: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 7 - phishing
    login.prototype.phishing = function () {
        var self = this;    // Own reference

        process.stdout.write('.');

        request({
            url: urls.phishing,
            jar: self.jar,
            json: true,
            headers: {
                'Easw-Session-Data-Nucleus-Id': self.nucleusId,
                'X-UT-Embed-Error': 'true',
                'X-UT-Route': self.loginDetails.route,
                'X-UT-SID': self.sessionId,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-US:en;q=0.8',
                'Referer': 'http://www.easports.com/iframe/fut/?baseShowoffUrl=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team%2Fshow-off&guest_app_uri=http%3A%2F%2Fwww.easports.com%2Fuk%2Ffifa%2Ffootball-club%2Fultimate-team&locale=en_GB'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // Check if phishing is validated
                if (typeof body.debug !== 'undefined' && body.debug === "Already answered question.") {
                    self.phishingToken = body.token;
                    self.returnLogin(); // Login is completed
                } else {
                    self.validate();
                }
                
            } else {
                console.log('Error with phishing: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 8 - validate
    login.prototype.validate = function () {
        var self = this,    // Own reference
            dataString;     // String to be sent as the message of the POST request

        dataString = 'answer=' + self.loginDetails.hash; // Set POST data (hashed answer)

        process.stdout.write('.');
        request.post({
            url: urls.validate,
            jar: self.jar,
            body: dataString,
            headers: {
                'X-UT-SID': self.sessionId,
                'X-UT-Route': self.loginDetails.route,
                'Easw-Session-Data-Nucleus-Id': self.nucleusId,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error) {
                if (body.trim() !== '') {
                    self.phishingToken = JSON.parse(body).token;
                    self.returnLogin(); // Login is completed
                } else {
                    console.log('Error: received empty phishing token');
                    self.eventEmitter.emit('error');
                }
            } else {
                console.log('Error with validate: ' + error + ' - ' + response.statusCode);
                self.eventEmitter.emit('error');
            }
        });
    };

    // 9 - return the login response
    login.prototype.returnLogin = function () {
        var self = this;    // Own reference

        console.log('success!');

        // Invoke the callback, passing the object with login session info
        self.callback({
            'nucleusId': self.nucleusId,
            'userAccounts': self.userAccounts,
            'sessionId': self.sessionId,
            'phishingToken': self.phishingToken,
            'platform': self.loginDetails.platform
        });
    };

    // Method to start the login process
    login.prototype.login = function (loginDetails, callback) {
        var self = this;    // Own reference

        // Save arguments in properties
        self.loginDetails = loginDetails;
        self.callback = callback;

        // Create cookie
        self.jar = request.jar();

        // On error, restart the app
        self.eventEmitter.on('error', function () {
            setTimeout(function () {
                self.main();
            }, 15000);
        });

        // Start the app
        self.main();
    };

    // Export the module
    module.exports = login;
}());