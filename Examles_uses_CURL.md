### Examles uses CURL
You can test this examples in browser, just copy example code and past in console after run server http://127.0.0.1:8090
You can set custom port on web-server (default 8090)

DON'T FORGET TO ADD KEYS TO CFG.JS AS METIONED ABOVE (cfg.js)

#### Transfer methods

we have this transfer methods:
- transfer (send money from one user to another)
- limit_order_create (create your order on openledger exchange)
- limit_order_cancel (cancel your order)

```sh
$ curl -X POST 'http://127.0.0.1:8090/api/transfer' -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8' --data '{"from":"openledger","to":"incent","asset_id":"BTS","amount":2,"memo":"","need_convert_money":true,"debug":true,"type":"transfer"}'
```

#### History methods

we have this history methods:
- account_history (get all history of transaction from account)
- get_orders (get orders by chosen pair, for example 'OPEN.BTC' <=> 'BTS')
- check_orders (check if this real orders)

```sh
$ curl -X POST 'http://127.0.0.1:8090/api/history' -H 'Content-Type: application/x-www-form-urlencoded; charset=utf-8'  --data-urlencode '{"account":"openledger","position":0,"type":"account_history"}'
<<<<<<< HEAD
```
=======
```

>>>>>>> 97bbe486cb8624be624fcbb1ada193975427b027
