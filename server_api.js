const http = require('http');
const path = require('path');
const url = require('url');
const co = require('co');
const cfg = require(path.join(__dirname, 'cfg'));
const middlewares = require(path.join(__dirname, 'middlewares'));
let api_lib = require(path.join(__dirname, 'libs'));

// "\x1b[31m","colorize message","\x1b[0m" 
// https://help.ubuntu.com/community/CustomizingBashPrompt

function catch_err(res) {
    return function(err) {
        res.statusCode = 500;
        console.log("\x1b[31m", err, "\x1b[0m");
        if (err && err.message) {
            res._error_message = err.message.toLowerCase().split('{')[0].match(/[a-z,0-9,\,\-]+/g).filter((e, i, arr) => {
                return arr[i] !== arr[i + 1] && arr[i] !== arr[i + 2];
            }).join(' ');
        } else {
            res._error_message = { "_error": "unknown error" };
        }
        res.end(api_lib.encrypt(res));
    }
}

const webpack = require('webpack');
const compiler = webpack(require(path.join(__dirname, 'webpack.config')));
const server = new http.Server();

server.on('request', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*'); // warning your CORS is open
    let urlParsed = url.parse(req.url, true);
    console.log("->", req.method, req.url, urlParsed.query);

    co(function*() {
        let parsed = yield * middlewares(req, res);
        if (req.method == "GET") {
            if (urlParsed.pathname == '/') {
                res.end('open console and Run script from example');
            } else {
                res.statusCode = 404;
            }
        } else if (req.method == "POST") {
            if (urlParsed.pathname == '/api/transfer') {
                res.ans = yield * api_lib.transfer(parsed);
            } else if (urlParsed.pathname == '/api/history') {
                res.ans = yield * api_lib.history(parsed);
            } else {
                res.statusCode = 404;
            }
        } else {
            res.statusCode = 404;
        }

        console.log("@>ok");

        res.end(api_lib.encrypt(res));

    }).catch(catch_err(res));
});

console.log(`\x1b[34m port was set: ${''||process.argv[2]} \x1b[0m`);

server.listen(process.argv[2] || 8090, () => { console.log(cfg.localhost + ':' + (process.argv[2] || 8090)) });
