'use strict';
const { Aes, PrivateKey, PublicKey, ChainTypes: { operations } } = require("graphenejs-lib");
const operationsTypes = Object.keys(operations);

module.exports = function(lib) {

    lib.set_symbols = (symbols) => {
        symbols.map(money_obj => {
            if (money_obj) {
                lib.currencies.names[money_obj.symbol] = {
                    id: money_obj.id,
                    name: money_obj.symbol,
                    precision: money_obj.precision
                };

                lib.currencies.ids[money_obj.id] = {
                    id: money_obj.id,
                    name: money_obj.symbol,
                    precision: money_obj.precision
                };
            }
        });
    };

    lib.createTransferMessage = (tr, name) => {
        //console.log("type======>", JSON.stringify(tr));
        let ans = {};

        let op_str = JSON.stringify(tr);

        op_str.match(/\[\d{0,2},{"fee":{[^}]+\"}/gi).map(op => {
            let fee_tr = JSON.parse(op + '}]');
            ans[operationsTypes[fee_tr[0]]] = {
                fee: fee_tr[1].fee
            };
        });

        for (let type_op in ans) {
            let transaction_body = ans[type_op];

            if (type_op == 'transfer') {
                let memo_text = '';
                if (op_str.match(/","message":"\w+"}/gi)) {
                    let memo = JSON.parse('{"a":"1' + op_str.match(/","message":"\w+"}/)).message;
                    try {
                        let sendler = JSON.parse(op_str.match(/{"from":"\w+\","to":"\w+\","nonce":"\w+\","message":"\w+\"}/));
                        let self_private_key = PrivateKey.fromWif(lib.private_keys[name]);
                        let my_public_key = self_private_key.toPublicKey().toPublicKeyString();
                        let sender_public_key = (my_public_key == sendler.to) ? PublicKey.fromPublicKeyString(sendler.from) : PublicKey.fromPublicKeyString(sendler.to);
                        memo_text = Aes.decrypt_with_checksum(
                            self_private_key,
                            sender_public_key,
                            sendler.nonce,
                            sendler.message,
                            true
                        ).toString("utf-8");
                        // console.log("memo_text~~>", memo_text);
                    } catch (e) {
                        memo_text = '_ERROR';
                        //console.log("transfer memo exception ...", e.message);
                    }
                    let special_symbol_apostraf = String.fromCharCode(8217);
                    memo_text = memo_text.split(special_symbol_apostraf).join("'");
                    transaction_body.memo = memo_text;
                }

                let money, currency;
                let amount_parsed = JSON.parse('{"a":1' + op_str.match(/,"amount":{"amount":"{0,1}\d+"{0,1},"asset_id":"[^"]+\"},/) + '"a":1}').amount;

                transaction_body.amount = {
                    converted: amount_parsed.amount / Math.pow(10, lib.currencies.ids[amount_parsed.asset_id].precision),
                    currency: lib.currencies.ids[amount_parsed.asset_id].name,
                    amount: amount_parsed.amount,
                    assets_id: amount_parsed.asset_id
                };
            } else if (type_op == 'limit_order_create') {

                let seller_and_amount = JSON.parse('{"a":{' + op_str.match(/},"seller":"\d+\.\d+\.\d+","amount_to_sell":{"amount":"{0,1}\d+"{0,1},"asset_id":"\d+\.\d+\.\d+"}/g) + '}');
                let exp = JSON.parse('{"a":{"a":"1' + op_str.match(/"},"min_to_receive":{"amount":"{0,1}\d+"{0,1},"asset_id":"\d+\.\d+\.\d+"},"expiration":"\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}\","fill_or_kill":\w+/) + '}');

                transaction_body.sellerID = seller_and_amount.seller;
                transaction_body.sellerName = name;
                transaction_body.expiration = exp.expiration;
                transaction_body.fill_or_kill = exp.fill_or_kill;
                transaction_body.min_to_receive = exp.min_to_receive;
                transaction_body.amount_to_sell = seller_and_amount.amount_to_sell;

                transaction_body.min_to_receive.currency = lib.currencies.ids[transaction_body.min_to_receive.asset_id].name;
                transaction_body.amount_to_sell.currency = lib.currencies.ids[transaction_body.amount_to_sell.asset_id].name;
                transaction_body.base_quote = transaction_body.min_to_receive.currency + "_" + transaction_body.amount_to_sell.currency;

                let order = op_str.match(/result(s){0,1}":\[{1,2}1,"\d+\.\d+\.\d+"]/) + '';
                if (order) {
                    transaction_body.order_id = order.match(/\d+\.\d+\.\d+/) + '';
                }

            } else if (type_op == 'limit_order_cancel') {
                let ord = JSON.parse('{' + op_str.match(/"fee_paying_account":"\d+\.\d+\.\d+","order":"\d+\.\d+\.\d+"/) + '}');
                transaction_body.fee_paying_account = ord.fee_paying_account;
                transaction_body.order_id = ord.order_id;
            } else if (type_op == 'fill_order') {
                let ord_and_acc = JSON.parse('{"a":{"a":"1' + op_str.match(/"},"order_id":"\d+\.\d+\.\d+","account_id":"\d+\.\d+\.\d+"/) + '}');
                let pays = JSON.parse('{"a":"1' + op_str.match(/","pays":{"amount":"{0,1}\d+"{0,1},"asset_id":"\d+\.\d+\.\d+"}/) + '}');
                let receives = JSON.parse('{"a":{"a":"' + op_str.match(/"},"receives":{"amount":"{0,1}\d+"{0,1},"asset_id":"\d+\.\d+\.\d+"}/) + '}');
                transaction_body.pays = pays.pays;
                transaction_body.order_id = ord_and_acc.order_id;
                transaction_body.account_id = ord_and_acc.account_id;
                transaction_body.receives = receives.receives;
            }
        }

        return ans;
    };
}
