var require = patchRequire(require);

var fs = require('fs');
var system = require('system'),

ali_home= system.env.HOME + "/.ali";
cookie_file = ali_home+'/ebay.cookies';
delimiter = ':';
exports.delimiter = delimiter;

casper = require('casper').create( {
    onStepTimeout: function(err) { 
      //this.capture("step_timeout.png");
      this.echo(JSON.dump({"error":"Step Timeout: " + err}));
   },
    onWaitTimeout: function(err) { 
      //this.capture("wait_timeout.png");
      this.echo(JSON.dump({"error":"Wait Timeout: " + err}));
   },
    onTimeout: function(err) { 
      //this.capture("timeout.png");
      this.echo(JSON.dump({"error":"Timeout: " + err}));
   }
});

function create_casper () {
  // TODO parameter for type (ali|ebay) to make it more generic
  //
  casper.options.stepTimeout = 10000;
  //this.customHeaders={"Referer":,"DNT":"1"};
  casper.userAgent("Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36");
  casper.on('remote.message', function(msg) {
          system.stderr.writeLine('remote message caught: ' + msg);
  });

  casper.on('page.error', function(err) {
        this.echo(JSON.dump({"error":"Complete callback has failed: " + err}));
        casper.exit(1);
  });
  this.casper = casper;
  return casper;
}

this.open_failed = function(){
    this.casper.capture("open_failed.png") 
    this.casper.echo(JSON.stringify({"error":"not logged in!"}));
    this.casper.exit(1);
};

function load_cookies() { 
  try{
      var data = fs.read(cookie_file);
      return JSON.parse(data);
  }catch(e){
      casper.echo(JSON.stringify({"error":"cannot load cookies"}));
      system.exit(1);
  }
}
function write_cookies(phantom_cookies){
  var cookies = JSON.stringify(phantom.cookies);
  system.stderr.writeLine("writing cookies to " +cookie_file)
  fs.write(cookie_file, cookies, 644);
}

exports.create_casper = create_casper;
exports.write_cookies = write_cookies;
exports.load_cookies = load_cookies;
