module.exports = function(lib) {
    lib.encrypt = (res) => {
        if (res._error_message) {
            res.ans = { "_error": res._error_message };
        }

        return encodeURIComponent(JSON.stringify(res.ans));
    }

    lib.decrypt = (res) => {
        let data = decodeURIComponent(res._parsed_data);

        if (data) {
            return data;
        } else {
            console.log(`\x1b[33m`, 'warning empty message', "\x1b[0m");
            return '';
        }

    };

};

