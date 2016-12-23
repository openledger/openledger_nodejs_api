const path = require('path');
module.exports = function(lib) {
    lib.private_keys = require(path.join(__dirname, '..', 'cfg')).private_keys;
}
