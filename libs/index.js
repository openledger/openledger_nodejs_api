'use strict';
const fs = require('fs');
const path = require('path');

let api_obj = {
    process_status: '',
    currencies: {
        ids: {},
        names: {}
    },
    users_ans: {},
    wssapi: require(path.join(__dirname, '..', 'cfg')).wssapi
};

fs.readdirSync(__dirname).sort().map(file => {
    if (file !== 'index.js') {
        console.log("\x1b[36m", file, "\x1b[0m");
        require(path.join(__dirname, file))(api_obj);
    }
});

module.exports = api_obj;
