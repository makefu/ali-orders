// or "username:password@example.com/mydb"

var casper = require('casper').create(
    {onStepTimeout: function() {
      this.echo(JSON.dump({"error":"Step Timed out after 10s"}));
     }}),
    utils = require('utils'),
    system = require('system'),
    fs = require('fs');
var ali_home= system.env.HOME + "/.ali";
var order_list="http://trade.aliexpress.com/orderList.htm";
customHeaders={"Referer":order_list,"DNT":"1"};

var links =[],
    cookie_file = ali_home+'/ali.cookies';
if (casper.cli.args.length === 0){
  casper.echo("please provide order-id");
}
casper.userAgent("Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36");

casper.on('remote.message', function(msg) {
        system.stderr.writeLine('remote message caught: ' + msg);
});
casper.on('page.error', function(err) {
      this.echo(JSON.dump({"error":"Complete callback has failed: " + err}));
    system.exit(1);
    this.exit(1);
      //this.exit(1);
});
casper.options.stepTimeout = 10000;
/*
 * selectors:
 */

//casper.echo("loading cookie file")
system.stderr.writeLine("loading cookie file")
try{
    var data = fs.read(cookie_file)
    phantom.cookies = JSON.parse(data)
}catch(e){
    casper.echo(JSON.stringify({"error":"cannot load cookies"}))
    system.exit(1)
    this.exit(1);
}

function open_failed(){
    this.capture('open-failed.png')
    this.echo(JSON.stringify({"error":"not logged in!"}))
    system.exit(1)
    this.exit(1);
}


// wait for redirect and for the button to the 'next' page appear

function open_orderlink(link){
  system.stderr.writeLine("waiting for selector on "+link)
  casper.thenOpen(link,{headers:customHeaders}).waitForSelector('.order-bd',confirm_order,open_failed,casper.options.stepTimeout); 
}
function confirm_order(){
  if (!(this.exists('#select-all'))){
    this.echo(JSON.stringify({"error":"order already confirmed"}))
    this.exit(1)
  }
  this.click('#select-all')
  system.stderr.writeLine('pressed #select-all')
  this.wait(500,function(){
    this.click('#button_confirmOrderReceived')
    system.stderr.writeLine('pressed #confirmOrderReceived')
    this.waitForSelector('#ui-window-confirmbtn',function(){
      this.click('#ui-window-confirmbtn')
      system.stderr.writeLine('pressed #window-confirmbtn')
      this.waitForUrl(/feedback\.aliexpress\.com\/management/,function(){
        //this.capture('confirmed-order.png')
        this.echo(JSON.stringify({"success":true}))
        this.exit(0)
      })
    })
  });
  //this.capture('google.png')
}

casper.start();

casper.cli.args.forEach(function(orderid){
  var order_link="http://trade.aliexpress.com/order_detail.htm?orderId="+orderid
  //casper.echo("Retrieving "+order_link)
  open_orderlink(order_link)

});


casper.run()
