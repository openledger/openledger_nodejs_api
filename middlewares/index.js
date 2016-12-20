'use strict';
const fs = require('fs');
const path = require('path');
let api_lib = require(path.join(__dirname, '..', 'libs'));

function parse_request(req, res) {
    return new Promise((resolve, reject) => {
        if (req.method == "GET") {
            resolve('ok');
            return;
        }


        let buf = [];

        req.on('data', function(data) {
            buf.push(data);
        });

        req.on('end', function() {
            let endcoded_ans = Buffer.concat(buf).toString("utf8");

            try {
                res._parsed_data = endcoded_ans;
                console.log("raw data:\n", res._parsed_data);
                let send = JSON.parse(api_lib.decrypt(res));

                console.log("try", send);
                resolve(send);
            } catch (err) {
                reject(err);
            }
        });
    });
}

let middlewares = [];

fs.readdirSync(__dirname).sort().map(file => {
    if (file !== 'index.js') {
        console.log("\x1b[35m", file, "\x1b[0m");
        middlewares.push(require(path.join(__dirname, file)));
    }
});

module.exports = function*(req, res) {

    for (let i in middlewares) {
        yield middlewares[i](req, res);
    }

    return yield parse_request(req, res);
}
