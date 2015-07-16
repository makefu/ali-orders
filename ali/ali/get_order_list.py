#!/usr/bin/env python
# vim: set ts=4 sw=4 
# TODO: this does not yet work
from core import load_config,save_db,load_db
from splinter import Browser
import time
from pprint import pprint
#order_list="http://trade.aliexpress.com/orderList.htm"
order_list='http://trade.alibaba.com/order_list.htm'
ali_website="http://aliexpress.com/"
customHeaders={"Referer":ali_website,"DNT":"1"}

config = load_config()
aconf=config['ali']

with Browser("firefox",user_agent=config['user_agent']) as browser:
    browser.visit(ali_website)
    browser.cookies.add(load_db(aconf['cookie_file']))
    pprint(browser.cookies.all())
    browser.find_by_css('.nav-user-account').mouse_over()
    time.sleep(10)
    browser.click_link_by_href(order_list)
    pprint(browser.cookies.all())
    time.sleep(20)




"""
// partly from https://code.google.com/p/phantomjs/issues/attachmentText?id=716&aid=7160000000&name=alipromo.js&token=78bfXm_YEKbtdwqWmkdPRGO7_fU%3A1352647368420
     
var casper = require('casper').create(),
    utils = require('utils'),
    system = require('system'),
    fs = require('fs');
var ali_home= system.env.HOME + "/.ali";
var orders =[],
    full_parse = true,
    cookie_file = ali_home+'/ali.cookies';
var order_list="http://trade.aliexpress.com/orderList.htm";
var ali_website="http://aliexpress.com/";
customHeaders={"Referer":ali_website,"DNT":"1"};
casper.options.stepTimeout = 10000;
casper.userAgent("Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36");

casper.on('page.error', function(err) {
      this.echo(JSON.dump({"error":"Complete callback has failed: " + err}));
      system.exit(1);
});

if (casper.cli.args.length === 0){
  system.stderr.writeLine("crawling first page")
  full_parse=false
}else{
  system.stderr.writeLine("crawling complete order list")
  full_parse=true
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

function hasNextButton(){
    return document.querySelector('.next');
}
function getPageText(){
    return document.querySelector('.pages-total').textContent;
}
function getLinks() {
    var orders = [];
    var sel_orders = document.querySelectorAll('.ae-order');
    for (var i = 0, len = sel_orders.length; i < len; i++){
        sel_order = sel_orders[i]
        order = parseInt(sel_order.getAttribute('data-orderid'),10)
        orders.push(order)
    }
    //.other-info .sell-sp-main (what guarantees give the seller)
    return orders

}
function open_failed(){
    this.echo(JSON.stringify({"error":"not logged in!"})).exit(1)
}

system.stderr.writeLine("loading cookie file")
function parse_orders(){
    system.stderr.writeLine("waiting for selector");
    casper.waitForSelector('.ae-order',function(){
        system.stderr.writeLine(this.evaluate(getPageText))
        Array.prototype.push.apply(orders,this.evaluate(getLinks));
        if (full_parse ){
            if (! this.evaluate(hasNextButton)){
                system.stderr.writeLine("at last page!")
                casper.echo(JSON.stringify(orders));
                casper.exit()
            }
            this.click('.next');
            system.stderr.writeLine("clicked next")
            casper.wait(3000,parse_orders)
        }else{
            casper.echo(JSON.stringify(orders));
        }
    },open_failed,4000);
}
try{
    var data = fs.read(cookie_file)
    phantom.cookies = JSON.parse(data)
    casper.start(order_list,{headers:customHeaders})
    parse_orders()
        //orders = (this.evaluate(getLinks));
        //system.stderr.writeLine(JSON.stringify(orders));
    casper.run()
}catch(e){
    this.echo(JSON.stringify({"error":"cannot load cookies"})).exit(1)
}
"""
