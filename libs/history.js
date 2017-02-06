'use strict';
const { Apis } = require("bitsharesjs-ws");

module.exports = function(lib) {
    lib.account_history = function*(payer) {
        let users_ans = {};
        let res = yield Apis.instance(lib.wssapi, true).init_promise;
        console.log(res[0].network);
        let names = yield Apis.instance().db_api().exec("get_full_accounts", [
            [payer.account], false
        ]);

        if (!names.length) {
            throw new Error('user is not exist');
        }

        names.map((acc) => {
            let balance = {};

            acc[1].balances.map((e) => {
                if (e.asset_type) {
                    let m = e.asset_type;
                    lib.currencies.ids[e.asset_type] = {};
                    balance[m] = balance[m] ? parseFloat(e.balance) : parseFloat(e.balance);
                }
            });

            acc[1].limit_orders.map((e) => {
                if (e.asset_type) {
                    let m = e.asset_type;
                    lib.currencies.ids[e.asset_type] = {};
                    balance[m] = balance[m] ? balance[m] + parseFloat(e.sell_price.base.amount) : parseFloat(e.sell_price.base.amount);
                }
            });

            users_ans[acc[0]] = {
                balance: balance,
                id: acc[1].account.id
            };
        });

        for (let i in users_ans) {
            let first_block; //first object
            let operations_object = {};
            let position = payer.position ? parseInt(payer.position) / 100 : 0;

            for (let i1 = position; i1 < 15; i1 += 1) {
                console.log('i1>', i1);
                let mh = yield Apis.instance().history_api().exec("get_relative_account_history", [users_ans[i].id, 0, 100, i1 * 100]);

                if (!mh[0]) {
                    break;
                }

                if (first_block == mh[0].block_num) {
                    console.log('stop');
                    break;
                }

                first_block = mh[0].block_num;

                mh.map((e) => {
                    JSON.stringify(e).match(/,"asset_id":"[^"]+"/g).map(e => { lib.currencies.ids[e.split('":"')[1].slice(0, -1)] = {} })
                    operations_object[e.block_num] = e;
                });

                users_ans[i].operations_object = operations_object;
                // if(mh.length<99) break;
            }
        }

        let currencies_ans = yield Apis.instance().db_api().exec("lookup_asset_symbols", [
            Object.keys(lib.currencies.ids)
        ]);

        lib.set_symbols(currencies_ans);

        for (let i in users_ans) {
            Object.keys(users_ans[i].balance).map(e => {
                if (e.split('.').length == 3) {
                    users_ans[i].balance[lib.currencies.ids[e].name] = users_ans[i].balance[e] / Math.pow(10, lib.currencies.ids[e].precision);
                }
            });

            let usr = users_ans[i].operations_object;
            users_ans[i].history = {};
            for (let i1 in usr) {
                users_ans[i].history[i1] = lib.createTransferMessage(usr[i1], i);
            }
            delete users_ans[i].operations_object;
        }

        if (payer.option === 'realorders') {
            let orders_all = [];
            let order_ans = {};
            let arr = users_ans[payer.account].history;

            for (let i1 in arr) {
                for (let i2 in arr[i1]) {
                    i2 === "limit_order_create" ? orders_all.push(arr[i1][i2].order_id) : 1;
                }
            }

            let real_orders = yield lib.check_orders(orders_all);
            real_orders = real_orders.filter(e => e).map(e => e.id);

            console.log("real_orders", real_orders);

            for (let i1 in arr) {
                for (let i2 in arr[i1]) {
                    if (i2 === "limit_order_create") {
                        if (~real_orders.indexOf(arr[i1][i2].order_id)) {
                            !order_ans[arr[i1][i2].base_quote] ? order_ans[arr[i1][i2].base_quote] = {} : 1;
                            order_ans[arr[i1][i2].base_quote][i1] = arr[i1][i2];
                        }
                    }
                }
            }

            return order_ans;
        } else {
            return users_ans;
        }
    };


    lib.check_orders = function*(ids) {
        let connection = yield Apis.instance(lib.wssapi, true).init_promise;
        console.log("connected to:", JSON.stringify(connection[0].network));
        let ids_result = yield Apis.instance().db_api().exec("get_objects", [
            ids
        ]);
        return ids_result;
    }


    lib.get_orders = function*(obj) {
        let connection = yield Apis.instance(lib.wssapi, true).init_promise;
        console.log("connected to:", JSON.stringify(connection[0].network));


        let subID = obj.quote + '_' + obj.base;


        let bucketSize = 86400;
        let bucketCount = 200;

        let callPromise = null;
        let settlePromise = null;
        let subscribe_to_market = null;

        let startDate = new Date();
        let endDate = new Date();
        let startDateShort = new Date();
        startDate = new Date(startDate.getTime() - bucketSize * bucketCount * 1000);
        startDateShort = new Date(startDateShort.getTime() - 3600 * 50 * 1000);
        endDate.setDate(endDate.getDate() + 1);

        let currencies = yield Apis.instance().db_api().exec("lookup_asset_symbols", [
            [obj.base, obj.quote]
        ]);

        if (~currencies.indexOf(null)) {
            throw new Error("some currency is not exist");
        }

        let ans = yield Promise.all([
            subscribe_to_market,
            Apis.instance().db_api().exec("get_limit_orders", [
                obj.base, obj.quote, 100
            ]),
            callPromise,
            settlePromise,
            Apis.instance().history_api().exec("get_market_history", [
                obj.base, obj.quote, bucketSize, startDate.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)
            ]),
            Apis.instance().history_api().exec("get_market_history_buckets", []),
            Apis.instance().history_api().exec("get_fill_order_history", [obj.base, obj.quote, 200]),
            Apis.instance().history_api().exec("get_market_history", [
                obj.base, obj.quote, 3600, startDateShort.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)
            ]),
            Apis.instance().db_api().exec("lookup_asset_symbols", [
                [obj.base, obj.quote]
            ])
        ]);

        let ans_obj = {
            asks: {},
            bids: {},
            limits: ans[1],
            /*calls: ans[2],
            settles: ans[3],
            price: ans[4],
            buckets: ans[5],
            history: ans[6],
            recent: ans[7],
            base: ans[8][0],
            quote: ans[8][1],
            market: subID,
            inverted: false,*/
        };

        lib.set_symbols(ans[8]);

        ans_obj.limits.map((e) => {
            //console.log("@>", e.sell_price);
            let base = lib.currencies.ids[e.sell_price.base.asset_id];
            let quote = lib.currencies.ids[e.sell_price.quote.asset_id];

            let base_price = e.sell_price.base.amount / Math.pow(10, base.precision);
            let quote_price = e.sell_price.quote.amount / Math.pow(10, quote.precision);

            e.sell_price.base.converted = base_price;
            e.sell_price.quote.converted = quote_price;

            let ask_or_bids = '';
            let order_price = 0;

            if (e.sell_price.base.asset_id === obj.base && e.sell_price.quote.asset_id === obj.quote) {
                order_price = quote_price / base_price;
                ask_or_bids = 'asks';
            } else if (e.sell_price.base.asset_id === obj.quote && e.sell_price.quote.asset_id === obj.base) {
                order_price = base_price / quote_price;
                ask_or_bids = 'bids';
            }

            if (ans_obj[ask_or_bids][order_price]) {
                ans_obj[ask_or_bids][order_price].base.amount += e.sell_price.base.amount;
                ans_obj[ask_or_bids][order_price].base.converted += base_price;
                ans_obj[ask_or_bids][order_price].quote.amount += e.sell_price.quote.amount;
                ans_obj[ask_or_bids][order_price].quote.converted += quote_price;
            } else {
                ans_obj[ask_or_bids][order_price] = {
                    base: e.sell_price.base,
                    quote: e.sell_price.quote
                };

                ans_obj[ask_or_bids][order_price].base.converted = base_price;
                ans_obj[ask_or_bids][order_price].quote.converted = quote_price;
            }
        });
        return ans_obj;
    }

    lib.history = function*(send) {
        switch (send.type) {
            case 'account_history':
                return yield * lib.account_history(send);
                break;
            case 'get_orders':
                return yield * lib.get_orders(send);
                break;
            case 'check_orders':
                return yield * lib.check_orders(send.orders);
                break;
            default:
                return "unknown type of operation";
                break;
        }
    };
};
