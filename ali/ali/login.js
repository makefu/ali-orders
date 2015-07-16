// partly from https://code.google.com/p/phantomjs/issues/attachmentText?id=716&aid=7160000000&name=alipromo.js&token=78bfXm_YEKbtdwqWmkdPRGO7_fU%3A1352647368420
var casper = require('casper').create(),
    utils = require('utils'),
    system = require('system'),
    fs = require('fs');
var login_url="http://trade.aliexpress.com/orderList.htm",
    ali_home= system.env.HOME + "/.ali",
    cookie_file = ali_home+ '/ali.cookies',
    login_name="your-ali-username@example.com",
    password="your-ali-password";

//casper.userAgent("Mozilla/5.0 (X11; Linux x86_64; rv:28.0) Gecko/20100101 Firefox/28.0");
//casper.userAgent("Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36");
//customHeaders = { "Referer" : "http://aliexpress.com" };
/*casper.echo("loading cookie file")
try{
    var data = fs.read(file)
    phantom.cookies = JSON.parse(data)
}catch(e){
    casper.echo("cannot load cookie file")
}*/

// login with automatic redirect
system.stderr.writeLine("waiting for selector");
casper.start(login_url).waitForSelector('form#login-form', function (){
        this.fill('form#login-form',{'fm-login-id': login_name,
                            'fm-login-password': password},false);
        this.click('#fm-login-submit');
        system.stderr.writeLine("clicked signIn");
        casper.waitForUrl(/orderList\.htm/).waitForSelector('.ae-order',function(){
            var cookies = JSON.stringify(phantom.cookies)
            fs.write(cookie_file, cookies, 644)
            system.stderr.writeLine("writing cookies to " +cookie_file)
            this.echo(JSON.stringify({"success":true}))
        });
    },function (){
        this.capture('failed_login.png')
        this.echo(JSON.stringify({"success":false,"error":"error while logging in"}))
    },6000
) 
// wait for redirect and for the button to the 'next' page appear

casper.run()
