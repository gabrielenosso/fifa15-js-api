(function () {
    // Modules
    var events = require('events'),     // Module to manage Events
        request = require('request');   // Module to manage HTTP/HTTPS requests

    /**
     * Class constructor
     * @class futapi
     * @constructor
     */
    function futapi() {
    }

    /**
     * Initialize the api
     * @param  {Object} loginData Object that contains info on the session.
     *                            The object can be obtained using the user module "login.js".
     *                            It should contain properties "sessionID", "phishingToken", "platform".
     */
    futapi.prototype.init = function (loginData) {
        var self = this;    // Own reference

        // Set the url based on the console
        if (loginData.platform === 'XBOX') {
            self.host = 'https://utas.fut.ea.com';
        } else {
            self.host = 'https://utas.s2.fut.ea.com';
        }

        // Set default values for requests
        self.request = request.defaults({
            followAllRedirects: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
                'Origin': 'http://www.easports.com',
                'Referer': 'http://www.easports.com/iframe/fut/bundles/futweb/web/flash/FifaUltimateTeam.swf',
                'X-HTTP-Method-Override': 'GET',
                'X-UT-Embed-Error': 'true',
                'X-UT-PHISHING-TOKEN': loginData.phishingToken,
                'X-UT-SID': loginData.sessionId
            }
        });
    };

    /**
     * Get Club credits
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: the available credits (Number)
     */
    futapi.prototype.getCredits = function (callback) {
        var self = this;    // Own reference

        self.request.post(self.host + '/ut/game/fifa15/user/credits', {
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body.credits);
            } else {
                console.log('Error with getCredits(): ' + error);
            }
        });
    };

    /**
     * Get info on a trade
     * @param  {Number}   tradeId  ID of the trade
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: an object containing the trade details.
     * 
     */
    futapi.prototype.tradeInfo = function (tradeId, callback) {
        var self = this;    // Own reference

        self.request.post(self.host + '/ut/game/fifa15/trade/status?tradeIds=' + tradeId, {
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with tradeInfo(): ' + error);
            }
        });
    };

    /**
     * Search player on the transfer market
     * @param  {Number}   playerId  ID of the player (players IDs can be easily found on sofifa.com)
     * @param  {Number}   minBin    Minimum Buy Now price
     * @param  {Number}   maxBin    Maximum Buy Now price
     * @param  {Number}   start     Search offset
     * @param  {Number}   num       Number of offers to return (maximum = 16)
     * @param  {Function} success   The function that will be invoked when the request is completed successfully.
     *                              It will be invoked with a single parameter: an object containing the auctions details.
     * @param  {Function} error     The function that will be invoked when an error happens.
     *                              It will be invoked with a single parameter: the error.
     */
    futapi.prototype.playerSearch = function (playerId, minBin, maxBin, start, num, success, error) {
        var self = this,        // Own reference
            searchString = '';  // String that contains all parameters to be sent with the request

        // Set default values for search parameters
        playerId = playerId ||  0;
        minBin   = minBin   ||  0;
        maxBin   = maxBin   ||  0;
        num      = num      || 16;
        start    = start    ||  0;

        // Build the string with the parameters
        searchString = 'type=player&start=' + start + '&num=' + num;

        // Add minimum Bin if specified
        if (minBin > 0) {
            searchString += '&minb=' + minBin;
        }

        // Add maximum Bin if specified
        if (maxBin > 0) {
            searchString += '&maxb=' + maxBin;
        }

        // Add player ID if specified
        if (playerId > 0) {
            searchString += '&maskedDefId=' + playerId;
        }

        self.request.post(self.host + '/ut/game/fifa15/transfermarket?' + searchString, {
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                success(body);
            } else {
                console.log('Error with playerSearch(): ' + error);
                error(error);
            }
        });
    };

    /**
     * Make a bid
     * @param  {Number}   tradeId  ID of the trade
     * @param  {Number}   bid      Credits for the bin
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: an object containing the bid result details.
     */
    futapi.prototype.bid = function (tradeId, bid, callback) {
        var self = this,    // Own reference
            dataString;     // String to be sent as the message of the POST request

        // Create data string to send with POST request
        dataString = JSON.stringify({
            'bid': bid
        });

        self.request.post(self.host + '/ut/game/fifa15/trade/' + tradeId + '/bid', {
            body: dataString,
            json: true,
            headers: {
                'X-HTTP-Method-Override': 'PUT',
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with bid(): ' + error);
            }
        });
    };

    /**
     * Put a card on market
     * @param  {Number}  id          ID of the card
     * @param  {Number}  bin         Buy now price
     * @param  {Number}  startingBid Starting price
     * @param  {Number}  duration    Duration in seconds (3600 = 1h)
     * @param {Function} callback    The function that will be invoked when the request is completed.
     *                               It will be invoked with a single parameter: an object containing the result.
     */
    futapi.prototype.listAuction = function(id, bin, startingBid, duration, callback) {
        var self = this,    // Own reference
            dataString;     // String to be sent as the message of the POST request

        // Create data string to send with POST request with passed parameters
        dataString = JSON.stringify({
            'itemData': {
                'id': id
            },
            'buyNowPrice':  bin,
            'startingBid':  startingBid,
            'duration':     duration
        });

        self.request.post(self.host + '/ut/game/fifa15/auctionhouse', {
            body: dataString,
            json: true,
            headers: {
                'X-HTTP-Method-Override': 'POST'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with listAuction(): ' + error);
            }
        });
    };

    /**
     * Send a card to the trade pile (transfer list) without putting it on the market.
     * @param {Number}  id          ID of the card
     * @param {Function} callback    The function that will be invoked when the request is completed.
     *                               It will be invoked with a single parameter: a boolean that is true if the
     *                               item was moved successfully, false otherwise.
     */
    futapi.prototype.sendToTradePile = function (id, callback) {
        var self = this,    // Own reference
            dataString;     // String to be sent as the message of the POST request

        // Create data string to send with POST request
        dataString = JSON.stringify({
            'itemData': [{
                'id': id,
                'pile': 'trade'
            }]
        });

        self.request.post(self.host + '/ut/game/fifa15/item', {
            body: dataString,
            json: true,
            headers: {
                'X-HTTP-Method-Override': 'PUT',
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body.itemData[0].success);
            } else {
                console.log('Error with sendToTradePile(): ' + error);
            }
        });
    };

    /**
     * Get the Trade Pile.
     * It is  the Transfer List page and it contains: Sold Items, Current transfers (your cards on market), Available items.
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: an object containing the trade pile.
     */
    futapi.prototype.getTradePile = function (callback) {
        var self = this;    // Own reference

        self.request({
            url: self.host + '/ut/game/fifa15/tradepile',
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with getTradePile(): ' + error);
            }
        });
    };

    /**
     * Get the Watch List.
     * It is the Transfer Target page and it contains: Expired, Active and Watched auctions. 
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: an object containing the watch list.
     */
    futapi.prototype.getWatchList = function (callback) {
        var self = this;    // Own reference

        self.request(self.host + '/ut/game/fifa15/watchlist', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with getWatchList(): ' + error);
            }
        });
    };

    /**
     * Remove card from sold items list
     * @param  {Number}   tradeId  ID of the trade
     * @param  {Function} callback It will be invoked with a single parameter: an object containing the result of the operation.
     */
    futapi.prototype.removeSold = function (tradeId, callback) {
        var self = this;    // Own reference

        self.request.post(self.host + '/ut/game/fifa15/trade/' + tradeId, {
            json: true,
            headers: {
                'X-HTTP-Method-Override': 'DELETE',
                'Content-Type': 'application/json'
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with removeSold(): ' + error);
            }
        });
    };

    /**
     * Get Purchased cards.
     * It is the page Unassigned, it lists cards purchased with Buy Now. 
     * @param  {Function} callback The function that will be invoked when the request is completed.
     *                             It will be invoked with a single parameter: an object containing the watch list.
     */
    futapi.prototype.getPurchased = function (callback) {
        var self = this;    // Own reference

        self.request({
            url: self.host + '/ut/game/fifa15/purchased/items',
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            } else {
                console.log('Error with getPurchased(): ' + error);
            }
        });
    };

    // Export the module
    module.exports = futapi;
}());