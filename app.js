// Modules
var events = require('events'),                     // Module to manage Events
    futapi = require('./user_modules/futapi.js'),   // Module with FUT API modules
    hash   = require('./user_modules/eahashor.js'), // Module to hash the secret answer
    login  = require('./user_modules/login.js'),    // Module to login to FUT

// Vars
    eventEmitter = new events.EventEmitter(),  // The Events Emitter (events management)
    loginDetails;                              // Stores login details

// Set login details
loginDetails = {
    "email":    "my@email.com",         // Origin account email
    "password": "myOriginPassword",     // Origin account password
    "platform": "PS",                   // XBOX or PS
    "answer":   "myAnswer"              // Your anwer (clean, not hashed!)
};

function mainLoop(loginData) {
    // Initialize FUT API
    futapi.init(loginData);

    // Get Credits
    futapi.getCredits(function (credits) {
        console.log(credits);
    });

    // Search player
    // (Search for Higuain with a Buy Now max price of 10000)
    futapi.playerSearch(167664, 0, 10000, null, null, function (result) {
        var tradeId; // ID of a trade

        console.log(result);

        // Get the last offer (trade id)
        tradeId = result.auctionInfo.pop().tradeId;
        
        // Get trade info
        futapi.tradeInfo(tradeId, function (tradeInfo) {
            console.log(tradeInfo);

            futapi.bid(tradeId, 200, function (result) {
                console.log(result);
            });
        })
    });

    // Send a card to trade pile (transfer list)
    futapi.sendToTradePile(163885496625, function (result) {
        console.log(result);
    });

    // Put a card on market
    futapi.listAuction(163885496625, 1000, 500, 3600, function (result) {
        console.log(result);
    });

    // Remove sold card
    futapi.removeSold(32515474, function (result) {
        console.log(result);
    });


    // Get Trade Pile
    futapi.getTradePile(function (tradePile) {
        console.log(tradePile);
    });

    // Get Watch List
    futapi.getWatchList(function (tradePile) {
        console.log(tradePile);
    });

    // Get Purchased Cards
    futapi.getPurchased(function (cardList) {
        console.log(cardList);
    });
};

// Get the hashed answer and save it in login details
loginDetails.hash = hash(loginDetails.answer);

// Login to FUT, then start the main loop
login(loginDetails, mainLoop);