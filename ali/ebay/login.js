// partly from https://code.google.com/p/phantomjs/issues/attachmentText?id=716&aid=7160000000&name=alipromo.js&token=78bfXm_YEKbtdwqWmkdPRGO7_fU%3A1352647368420
var core = require('core'),
    utils = require('utils'),
    system = require('system'),
    fs = require('fs');
var casper = core.create_casper();

var login_url="http://my.ebay.com/ws/eBayISAPI.dll?MyEbay&gbh=1&CurrentPage=MyeBaySummary&ssPageName=STRK:ME:LNLK:MESUMX",
//var login_url="https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&UsingSSL=1&siteid=0&co_partnerId=2&pageType=2060778&ru=http%3A%2F%2Fmy.ebay.com%2Fws%2FeBayISAPI.dll%3FMyEbay%26gbh%3D1%26CurrentPage%3DMyeBaySummary%26ssPageName%3DSTRK%3AME%3ALNLK%3AMESUMX",
    login_name="your-login",
    password="your-password";


// login with automatic redirect
system.stderr.writeLine("waiting for selector")
casper.start(login_url).waitForSelector('form#SignInForm', function (){
        system.stderr.writeLine("fill SignInForm")
        this.fill('form#SignInForm',{userid: login_name,
                            pass: password},false);
        this.click('#sgnBt');
        system.stderr.writeLine("clicked Sign In Button")
        casper.waitForUrl(/^http:\/\/my.ebay.com\/ws\/eBayISAPI.dll/).waitForSelector('.item-list-all',function(){
            core.write_cookies(phantom.cookies)
            this.echo(JSON.stringify({"success":true}))
            this.capture('ebay.png')
        });
    },function (){
        casper.capture('failed.png')
        this.echo(JSON.stringify({"success":false,"error":"error while logging in"}))
        system.exit(1)
    },20000) 
// wait for redirect and for the button to the 'next' page appear

casper.run()
