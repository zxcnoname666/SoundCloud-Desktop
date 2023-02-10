const request = require('request');
module.exports = {
    Send: function (url) {
        return new Promise(resolve => request.get({ url: url }, (error, response, body) => resolve({ error, response, body })));
    }
};