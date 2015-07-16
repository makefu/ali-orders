// partly from https://code.google.com/p/phantomjs/issues/attachmentText?id=716&aid=7160000000&name=alipromo.js&token=78bfXm_YEKbtdwqWmkdPRGO7_fU%3A1352647368420
// or "username:password@example.com/mydb"

var casper = require('casper').create(),
    utils = require('utils'),
    system = require('system'),
    fs = require('fs');
var ali_home= system.env.HOME + "/.ali";
var order_list="http://trade.aliexpress.com/orderList.htm";
var links =[],
    cookie_file = ali_home+'/ali.cookies';
if (casper.cli.args.length === 0){
  casper.echo("please provide order-id");
}

casper.on('remote.message', function(msg) {
        system.stderr.writeLine('remote message caught: ' + msg);
});
casper.on('page.error', function(err) {
      this.echo(JSON.dump({"error":"Complete callback has failed: " + err}));
      this.exit(1);
      system.exit(1);
});
casper.options.stepTimeout = 10000;
customHeaders={"Referer":order_list,"DNT":"1"};
casper.userAgent("Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36");
/*
 * selectors:
 */


function getLinks() {
    var order = {};
    var shipping_table = document.querySelectorAll('.shipping-table .shipping-bd');
    // shipping details
    for (var i = 0, len = shipping_table.length; i < len; i++){
        sel_ship=shipping_table[i]
        entry ={}
        entry['logistic'] = sel_ship.querySelector('.name .logistics-name').textContent.trim()
        entry['tracking'] = sel_ship.querySelector('.no').textContent.trim()
        entry['remarks'] = sel_ship.querySelector('.remark span').textContent.trim()
        details = []
        sel_items = sel_ship.querySelector('.detail .tracks-list').querySelectorAll('li')

        for (var j = 0, jlen = sel_items.length; j < jlen; j++){
            sel_item = sel_items[j];
            details.push(sel_item.textContent.trim())
        }
        entry['details'] = details
        order['shipping'] = entry

    }
    order['order-status'] = document.querySelector('.ui-box-content .clearfix .order-status').textContent.trim()
/* <ul class="operate-list clearfix">
 *    <li><label>Shipping Time</label>: <span>2014-08-19 03:11:42 </span></li>
 *    <li><label>Payment Date</label>: <span>2014-08-18 05:17:18 </span></li>
 *    <li><label>Order Date</label>: <span>2014-08-18 05:16:18 </span></li>
 *
 **/
    operate = document.querySelectorAll('#operate-pnl .operate-list span')
    if (operate){
      if (operate.length == 1){
        order['order-time'] = operate[0].textContent.trim()
        order['shipping-time'] = "Unknown"
        order['payment-time'] = "Unknown"
      } else if (operate.length == 2){
        order['payment-time'] = operate[0].textContent.trim()
        order['order-time'] = operate[1].textContent.trim()
        order['shipping-time'] = "Unknown"
      }else{
        order['shipping-time'] = operate[0].textContent.trim()
        order['payment-time'] = operate[1].textContent.trim()
        order['order-time'] = operate[2].textContent.trim()
      }
    }else{
      order['order-time'] = "Unknown"
      order['shipping-time'] = "Unknown"
      order['payment-time'] = document.querySelector('tbody .pay-c4').textContent.trim()
    }
    cd= document.querySelector('.order-reminder #countdown')
    if (cd){
      order['protection-reminder'] = {
        "days":     parseInt(cd.querySelector('#remain-day').textContent.trim() ,10),
        "hours":    parseInt(cd.querySelector('#remain-hour').textContent.trim() ,10),
        "minutes":  parseInt(cd.querySelector('#remain-min').textContent.trim() ,10),
        "seconds":  parseInt(cd.querySelector('#remain-sec').textContent.trim(),10)}
    }else{
      order['protection-reminder']={}
    }
    order['data-status'] = document.querySelector('.product-table tbody').getAttribute('data-status');
    order['data-orderid'] = parseInt(document.querySelector('.product-table tbody').getAttribute('data-orderid'),10);
    order['_id'] = parseInt(document.querySelector('.order-no').textContent.trim(),10);

    var product_table = document.querySelectorAll('.product-table .order-bd');
    products={}
    // shipping details
    for (var i = 0, len = product_table.length; i < len; i++){
        item={}
        sel_item=product_table[i]
        item['id'] = sel_item.getAttribute('id')+"_"+i
        item['title'] = sel_item.querySelector('.desc .baobei-name').textContent.trim()
        item['link'] = sel_item.querySelector('.desc .baobei-name').getAttribute('href')
        item['thumbnail'] = sel_item.querySelector('a.pic img').getAttribute('src')
        var p = sel_item.querySelector('.price').textContent.trim().split(" ")
        item['price-per-piece'] = parseFloat(p[p.length -1],10)
        var p = sel_item.querySelector('.amount').textContent.trim().split(" ")
        item['price'] = parseFloat(p[p.length -1],10)
        item['quantity'] = parseInt(sel_item.querySelector('.quantity').getAttribute('title'),10)
        item['trade-status'] = sel_item.querySelector('.trade-status').textContent.trim()

        if (sel_item.querySelector('.after-service span')){
            item['after-service'] = sel_item.querySelector('.after-service span').textContent.trim()
        }
        item['shipping-logistic'] = sel_item.querySelector('.shipping .order-target').textContent.trim()
        ship_price = sel_item.querySelector('.shipping .ship-price span')
        if (ship_price){
          item['shipping-price'] = ship_price.textContent.trim()
        }
        shipping_time = sel_item.querySelectorAll('.shipping .ship-info .ship-value')

        //item['shipping-time'] = shipping_time[0]
        if (shipping_time.length == 2){
          // first -> shipping time
          // second -> processing time
          //item['processing-time'] = shipping_time[1]
        }
        item['guarantees'] = {}
        guarantees = sel_item.querySelectorAll('.sell-sp-main *')
        for (var di = 0, mlen = guarantees.length; di < mlen; di++){
            d = guarantees[di]
            type = d.className.replace(/sp-icon/,'').trim()
            t = d.getAttribute('title')
            item['guarantees'][type]= t
        }
        console.log(len+ " " + i + " " + item['id'])
        products[item['id']]= item
    }
    order['products'] = products
    var price_table = document.querySelectorAll('.final-price');
    var p = price_table[0].textContent.trim().split(" ")
    order['product-amount'] = parseFloat(p[p.length -1],10)
    var p = price_table[1].textContent.trim().split(" ")
    order['shipping-cost'] = parseFloat(p[p.length -1],10)
    var p = price_table[2].textContent.trim().split(" ")
    order['total-amount'] = parseFloat(p[p.length -1],10)

    seller = {}
    seller['name'] =   document.querySelector('.user-info .user-name-text a').textContent.trim()
    seller['link'] =   document.querySelector('.user-info .user-name-text a').getAttribute("href")
    seller['id'] =     document.querySelector('.user-info .alitalk').getAttribute('memberid')
    seller['alitalk'] =document.querySelector('.user-info .alitalk').getAttribute('alitalk')
    seller['email'] =  document.querySelector('.user-info .user-email-text a').textContent.trim()
    order['seller'] = seller
    //.other-info .sell-sp-main (what guarantees give the seller)
    return order

}

//casper.echo("loading cookie file")
try{
    var data = fs.read(cookie_file)
    phantom.cookies = JSON.parse(data)
}catch(e){
    casper.echo(JSON.stringify({"error":"cannot load cookies"}))
    system.exit(1)
}

function open_failed(){
    this.echo(JSON.stringify({"error":"not logged in!"}))
    system.exit(1)
}


// wait for redirect and for the button to the 'next' page appear

function open_orderlink(link){
  system.stderr.writeLine("waiting for selector on "+link)
  casper.thenOpen(link,{headers:customHeaders}).waitForSelector('.order-bd',eval_order,open_failed,casper.options.stepTimeout); 
}
function eval_order(){
  system.stderr.writeLine("evaluating order")
  order = (this.evaluate(getLinks));
  utils.dump(order)
}

casper.start();

casper.cli.args.forEach(function(orderid){
  var order_link="http://trade.aliexpress.com/order_detail.htm?orderId="+orderid
  //casper.echo("Retrieving "+order_link)
  open_orderlink(order_link)

});


casper.run()
