const { Apis } = require("graphenejs-ws");
const { Aes, FetchChain, PrivateKey, TransactionHelper, TransactionBuilder } = require("graphenejs-lib");

module.exports = function(lib) {

    lib.getFee = function*(payer) {
        let self_private_key = '';
        let arr_currency = ['1.3.0'];
        let ids = [];
        let tr = new TransactionBuilder();

        let assets = JSON.stringify(payer).match(/"asset_id":"[A-Z\.0-9\-]+"/g);

        if (assets) {
            assets.map((e) => {
                arr_currency.push(JSON.parse('{' + e + '}').asset_id);
            });
        }

        console.log("\x1b[35m", payer, "<" + this.process_status + ">", "\x1b[0m");

        if (lib.private_keys[payer.from]) {
            self_private_key = PrivateKey.fromWif(lib.private_keys[payer.from]);
        } else {
            throw new Error("you don't have access for this operation");
        }

        let connection = yield Apis.instance(lib.wssapi, true).init_promise;
        console.log("connected to:", JSON.stringify(connection[0].network));

        let chain = yield Apis.instance().db_api().exec("get_objects", [
            ["2.1.0"]
        ]);

        if (Math.abs((new Date().getTime() - new Date(chain[0].time.split('T')[0]).getTime()) / 1000 / 60 / 60) > 24) {
            throw new Error("sync trouble", chain.time);
        }

        let promise_data = yield Promise.all([Apis.instance().db_api().exec("lookup_accounts", [
                payer.from, 1
            ]), Apis.instance().db_api().exec("lookup_accounts", [
                payer.to, 1
            ]),
            Apis.instance().db_api().exec("lookup_asset_symbols", [
                arr_currency
            ])
        ]);

        if (promise_data[0][0][0] !== payer.from) {
            throw new Error('sendler is not exist');
        }

        let symbols = promise_data[2];

        console.log("~>", JSON.stringify(symbols[1]));
        lib.set_symbols(symbols);
        if (~symbols.indexOf(null)) throw new Error('incorrect currency');
        let getAccount = yield Promise.all([
            FetchChain("getAccount", payer.from),
            FetchChain("getAccount", payer.to),
            FetchChain("getAccount", payer.from)
        ]);

        let [fromAccount, account, memoSender] = getAccount;

        switch (payer.type) {
            case "transfer":
                if (promise_data[1][0][0] !== payer.to) {
                    throw new Error('getter is not exist');
                }

                !payer.memo ? payer.memo = '' : 1;

                let currency = lib.currencies.names[payer.asset_id] || lib.currencies.ids[payer.asset_id];

                // Memos are optional, but if you have one you need to encrypt it here
                let memoFromKey = memoSender.getIn(["options", "memo_key"]);
                let memoToKey = account.getIn(["options", "memo_key"]);
                let nonce = TransactionHelper.unique_nonce_uint64();

                let memo_object = {
                    from: memoFromKey,
                    to: memoToKey,
                    nonce,
                    message: Aes.encrypt_with_checksum(
                        self_private_key,
                        memoToKey,
                        nonce,
                        payer.memo
                    )
                };

                payer.converted = payer.amount * (Math.pow(10, currency.precision));

                let transfer = {
                    fee: {
                        amount: 0,
                        asset_id: "1.3.0"
                    },
                    from: fromAccount.get("id"),
                    to: account.get("id"),
                    amount: {
                        amount: payer.need_convert_money ? payer.converted : payer.amount,
                        asset_id: currency.id
                    }
                };

                payer.memo ? transfer.memo = memo_object : 1;

                tr.add_type_operation("transfer", transfer);
                break;
            case "limit_order_create":
                let sell = lib.currencies.names[payer.amount_to_sell.asset_id] || lib.currencies.ids[payer.amount_to_sell.asset_id];
                let receive = lib.currencies.names[payer.min_to_receive.asset_id] || lib.currencies.ids[payer.min_to_receive.asset_id];

                tr.add_type_operation("limit_order_create", {
                    "fee": {
                        "amount": 0,
                        "asset_id": "1.3.0"
                    },
                    "seller": fromAccount.get("id"),
                    "amount_to_sell": {
                        "amount": payer.amount_to_sell.amount,
                        "asset_id": sell.id
                    },
                    "min_to_receive": {
                        "amount": payer.min_to_receive.amount,
                        "asset_id": receive.id
                    },
                    "expiration": (() => {
                        let t = new Date();
                        t.setFullYear((t.getFullYear() + 5));
                        return t.toISOString();
                    })(),
                    "fill_or_kill": false
                });
                break;
            case "limit_order_cancel":
                let orders_ids = yield lib.check_orders([payer.order_id]);
                if (!orders_ids[0]) throw new Error("can't delete this order");
                tr.add_type_operation("limit_order_cancel", {
                    fee: {
                        amount: 0,
                        asset_id: "1.3.0"
                    },
                    "fee_paying_account": fromAccount.get("id"),
                    "order": payer.order_id
                });
                break;
            default:
                throw new Error("type of operation is not set");
                break;
        }


        let get_required_fees = yield Apis.instance().db_api().exec("get_required_fees", [tr.serialize().operations, "1.3.0"]);
        payer.fee = get_required_fees[0].amount;
        tr.add_signer(self_private_key, self_private_key.toPublicKey().toPublicKeyString());
        tr.set_required_fees("1.3.0");

        payer.tr = tr;
        payer.meta = tr.serialize();
        return payer;

    };

    lib.transfer = function*(payer) {
        yield lib.getFee(payer);

        if (payer.debug) {
            return lib.createTransferMessage(payer.meta, payer.from); //not real
        }
        let transaction = yield payer.tr.broadcast(); //real 
        return lib.createTransferMessage(transaction, payer.from);
    };
}
