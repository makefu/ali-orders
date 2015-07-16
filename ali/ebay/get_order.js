
var  utils = require('utils'),
    system = require('system'),
    fs = require('fs'),
    core = require('./core');
var casper = core.create_casper();
var delimiter= core.delimiter;

var orders =[],
    full_parse = true;
var order_page="https://my.ebay.com/ws/eBayISAPI.dll?MyEbayBeta&CurrentPage=MyeBayNextSummary";

if (casper.cli.args.length === 0){
  casper.echo("please provide order-id");
}

function getLinks() {
    var order = {};
    sc = document.querySelector("#orderCostShippingAndHandling span span:not([class*='ng-hide'])").textContent.trim()
    if (sc == "Free"){
      order['shipping-cost'] = 0.0
    }else{
      order['shipping-cost'] = parseFloat(sc)
    }
    order['payment-time'] = document.querySelector('#orderPaymentDate').textContent.trim()
    order['order-time'] = document.querySelector('#orderPlacedOnDate').textContent.trim()
    // first span in payment method
    order['payment-method'] = document.querySelector('#paymentMethod span').textContent.trim();
    all_items = document.querySelectorAll(".package [data-src*='/vod/html/item.html']");
    [].forEach.call(all_items,function iterate_items(item) {
      item= {};
      details= item.querySelector("[data-src*='/vod/html/itemDetails.html'] div");
      id = item['id'] = details.id.split('_')[0];
      item['link'] = details.querySelector("a").href
      item['title'] = details.querySelector("[id='"+id+"_ItemTitle']").textContent.trim()
      item['quantity'] = parseInt(details.querySelector("[id='"+id+"_Quantity']").textContent,10);
      // because fuck you ebay for fucking prices up
      p = item['price-unparsed'] = details.querySelector("[id='"+id+"_Price']").textContent
      item['price'] = parseFloat(p.replace(/[^0-9.]*/g,''));
      item['currency'] = p.replace(/([0-9.]*)/g,'')
      item['price-per-piece'] = item['price']/item['quantity']
      item['shipping-logistic'] = details.querySelector("[id='"+id+"_ShippingService']").textContent
      item['thumbnail'] = item.querySelector("[id='"+id+"_ItemImage'] img").src
      item['shipping-price'] = document.querySelector("#orderCostShippingAndHandling span:not(.ng-hide)").textContent

    });
    // shipping details
    shipping_table = document.querySelectorAll(".ng-scope[data-ng-include*='/vod/html/shippingPackageTrackingStatusTable.html'] .row tr")
    for (var i = 0, len = shipping_table.length; i < len; i++){
        sel_ship=shipping_table[i]
        entry ={}
        // last scanned at
        /*if       (i == 0){

        }else if (i == 1){
        }else if (i == 2){

        }else if (i == 3){
          // shipping status
          order[
        }else if (i == 4){
        }else if (i == 5){
        }else{
        }*/
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
        item['id'] = sel_item.getAttribute('id')
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
  casper.thenOpen(link).waitForSelector('.order-bd',eval_order,open_failed,casper.options.stepTimeout); 
}
function eval_order(){
  system.stderr.writeLine("evaluating order")
  order = (this.evaluate(getLinks));
  utils.dump(order)
}

casper.start();

casper.cli.args.forEach(function(orderid){

  var transid= orderid.split(delimiter)[0]
  var itemid= orderid.split(delimiter)[1]
  var order_link="http://payments.ebay.de/ws/eBayISAPI.dll?ViewPaymentStatus&transId=" +transid + "&itemid=" + itemid

  system.stderr.writeLine("Retrieving "+order_link)
  //open_orderlink(order_link)

});


casper.run()
