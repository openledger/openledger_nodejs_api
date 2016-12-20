# Examples in browser

You can try these examples in browser on page http://127.0.0.1:8090, just copy example code and past in console (F12) after run server http://127.0.0.1:8090

You can set custom port on web-server (default 8090)

DONT FORGET ADD KEYS FOR USER WHICH START TRANSACTION. (cfg.js)

#### Transfer methods

we have this transfer methods:
- transfer (send money from one user to another)
- limit_order_create (create your order on openledger exchange)
- limit_order_cancel (cancel your order)

before start this code choose type of transaction for 'type' variable.
if you want do a real transaction, you need change key 'debug' to 'false'.

open

```sh
var type = 'transfer'; // 'choose type for transaction (transfer, limit_order_create, limit_order_cancel)' 
var xhr = new XMLHttpRequest();
xhr.open('POST', 'http://127.0.0.1:8090/api/transfer', true);  // 'your api adress'
xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
xhr.onreadystatechange = function(){
    if (this.readyState != 4) return;
    console.log(JSON.parse(decodeURIComponent(this.responseText)));
}
var message = '';
switch (type) {
    case "transfer": // 'simple transaction'
        message = JSON.stringify({
            from: "openledger",
            to: "incent", // 'example "1.2.96393"'
            asset_id: "BTS", // 'asset for send'
            amount: 2, // 'amount for send'
            memo: '', // 'optional memo message'
            need_convert_money: true, // 'convert your money to decimal range (5 => 500000)'
            debug: true, // 'transction not real if debug equal true'
            type: "transfer" // 'do not change this key' 
        });
        break;

    case "limit_order_create":
        message = JSON.stringify({
            from: "openledger",
            amount_to_sell: {
                "amount": 1000, //'amount for sell'
                "asset_id": "BTS" //'asset for sell'
            },
            "min_to_receive": {
                "amount": 400000, //'amount for receive'
                "asset_id": "OPEN.BTC" // 'asset for receive'
            },
 	    debug: true, // 'transction not real if debug equal true'
            type: "limit_order_create" // 'do not change this key'
        });
        break;
    case "limit_order_cancel":
        message = JSON.stringify({
            from: "openledger", // 'input here account name which have this order'
            order_id: "1.7.877183", // 'input here order id for delete'
            type: "limit_order_cancel" // 'do not change this key' 
        });
        break;
        
    default:
        message = "";
        break;
};
xhr.send(message);
```

#### History methods

we have this history methods:
- account_history (get all history of transaction from account)
- get_orders (get orders by chosen pair, for example 'OPEN.BTC' <=> 'BTS')
- check_orders (check if this real orders)

before start these code choose type of transaction for 'type' variable;

```sh
var type = 'account_history'; // 'choose type of request for history  (account_history , get_orders, check_orders)' 
var xhr = new XMLHttpRequest();
xhr.open('POST', 'http://127.0.0.1:8090/api/history', true); // 'your api adress'
xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
xhr.onreadystatechange = function() {
    if (this.readyState != 4) return;
    console.log(JSON.parse(decodeURIComponent(this.responseText)));
}
var message = '';

switch (type) {
    case "account_history":
        message = JSON.stringify({
            account: 'openledger', // an account which history you want to get
            position: 0, // start position from history getting
            //option: 'realorders',
            type: 'account_history'
        });

        break;
    case "get_orders":
        message = JSON.stringify({
            base: '1.3.849',
            quote: '1.3.0',
            type: "get_orders"
        });
        break;
    case "check_orders":
        message = JSON.stringify({
            orders: ["1.7.674525", "1.7.944743"],
            type: "check_orders"
        });
        break;
    default:
        message = "";
        break;
};
xhr.send(message);
```
