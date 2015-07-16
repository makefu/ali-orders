// vim: set ts=4 sw=4 :
//
// usage: casperjs get_order_list.js [--full] [--detailed]
var  utils = require('utils'),
    system = require('system'),
    fs = require('fs'),
    core = require('./core');
var casper = core.create_casper();
var delimiter= core.delimiter;

var orders =[],
    detailed_parse = false,
    full_parse = false;

var order_list="http://my.ebay.com/ws/eBayISAPI.dll?MyEbayBeta&CurrentPage=MyeBayNextSummary";

//casper.on('remote.message', function(msg) {
//        system.stderr.writeLine('remote message caught: ' + msg);
//});

if (casper.cli.get('full')){
  system.stderr.writeLine("crawling complete order list");
  full_parse=true;
}
if (casper.cli.get('detailed')){
  system.stderr.writeLine("crawling detailed list");
  detailed_parse=true;
}
if (casper.cli.get(0) == "help"){
  system.stderr.writeLine("usage: casperjs get_order_list.js [--full] [--detailed]");
  casper.exit()
}

//casper.on('remote.message', function(msg) {
//      this.echo('remote message caught: ' + msg);
//})
/*
 * selectors:
 * .querySelectorAll(".toolbar .ui-pager-label")[0].innerHTML.split(" ")[2] <- number of pages
 *
 *  document.querySelectorAll('.next') <- next button
 *    this.click('.next')
 *
 *
    function getOrders() {
    var links = document.querySelectorAll('.ae-order');
 */


// document.querySelector("div.filter").querySelectorAll("span.data-json")
function hasNextButton(){
    return document.querySelector('.next');
}
function clickNextButton(){
}

function getLastPage(){
    return document.querySelector('.pagination span').textContent.split(' ').pop()
}
function getCurrentPage(){
    return document.querySelector('.pagination span').textContent.split(' ')[1]
}

function getOptionSelection(){
    ret = [];
    document.querySelector('.arrow-down').click();
    [].forEach.call(document.querySelectorAll("[id*=OptionMenu] [role=menuitem]"),function (item){ret.push(item.textContent)})
    return ret;
}
function getCurrentOption(){
    return document.querySelector(".filter-content").textContent.trim()

}
// we always start with the current option

function getOptionLength(){
    // first we have to click the down arrow, then we can get the items
    document.querySelector('.arrow-down').click()
    // we click the first item, then the second, and so on
    return document.querySelectorAll("[id*=OptionMenu] [role=menuitem]").length
}

function atLastOption(current){
    function getOptionLength(){
        // first we have to click the down arrow, then we can get the items
        // we click the first item, then the second, and so on
        return document.querySelectorAll("[id*=OptionMenu] [role=menuitem]").length
    }
    return getOptionLength() == current ;
}

function atLastPage(){
    function getLastPage(){
        return document.querySelector('.pagination span').textContent.split(' ').pop()
    }
    function getCurrentPage(){
        return document.querySelector('.pagination span').textContent.split(' ')[1]
    }
    return getLastPage() == getCurrentPage();

}

function prepareOptions(){
    document.querySelector('.arrow-down').click()
}
function clickNextOption(current){
    //because nth-child counts from 1
    casper.click("[id*=OptionMenu] li:nth-child("+(1+current)+") [role=menuitem]")

    return 1+current
}

function getLinks(delimiter) {
    //console.log("in getLinks")
    var orders = [];
    var sel_orders = document.querySelectorAll('.paction');
    for (var i = 0, len = sel_orders.length; i < len; i++){
        sel_order = sel_orders[i]
        order_opts = sel_order.href.split('?')[1].split('&')
        var transid=0,
            itemid=0;
        for (var j = 0, optlen = order_opts.length; j < optlen; j++){
            cur_opt = order_opts[j].split('=');
            var k = cur_opt[0]
            var v = cur_opt[1]
            //console.log(k+" --> " + v)
            if (k == 'transId' || k == 'transactID' || k == 'transactionId'){
                transid=v;
            } else if (k == 'itemid' || k == 'iid' || k == 'item' || k == 'itemId' ) {
                itemid=v;
            }
        }
        orders.push(""+transid+delimiter+itemid)
        //console.log(""+transid+delimiter+itemid)
    }
    console.log(JSON.stringify(orders))
    return orders

}
function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
}

var current_option=0;
system.stderr.writeLine("loading cookie file")
function parse_orders(){
    system.stderr.writeLine("waiting for selector .item-list-all");
    //casper.waitForSelector('.item-list-all',function (){
        system.stderr.writeLine("waiting for timeout");
        casper.wait(1000,function (){

            system.stderr.writeLine("!!!!!!" + this.evaluate(getCurrentOption) + " Page "+ this.evaluate(getCurrentPage) + " of " + this.evaluate(getLastPage) )
            Array.prototype.push.apply(orders,this.evaluate(getLinks,delimiter));
            // go through all pages for all available options
            if (full_parse){
                this.click('.arrow-down')
                this.waitForSelector("[id*=OptionMenu] [role=menuitem]",function (){
                //casper.wait(500,function(){
                    if (this.evaluate(atLastPage)){
                        system.stderr.writeLine("at last page of current Option");
                        if (this.evaluate(atLastOption,current_option)){
                            system.stderr.writeLine("at last Option of Last page");
                        }else{

                                system.stderr.writeLine("current option " + current_option);
                                current_option = clickNextOption(current_option)
                                casper.capture("click-next.png")
                                system.stderr.writeLine("clicked next option ( at "+current_option+" of " +this.evaluate(getOptionLength)+")");
                                casper.wait(3000,parse_orders)
                         //   })
                        }
                        casper.echo(JSON.stringify(orders.filter(onlyUnique)));
                    }else{
                        casper.click('.next')
                        system.stderr.writeLine("clicked next")
                        casper.wait(3000,parse_orders)
                    }
                });
            }else{
                casper.echo(JSON.stringify(orders.filter(onlyUnique)));
            }
        });
    //},core.open_failed,5000);
}

phantom.cookies = core.load_cookies();
casper.start().thenOpen(order_list,parse_orders)
    //orders = (this.evaluate(getLinks));
    //system.stderr.writeLine(JSON.stringify(orders));
casper.run()
