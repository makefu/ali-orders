from core import run_casper,save_db,load_db
from datetime import datetime,timedelta
import logging 
log = logging.getLogger('cli')

list_js="ali/get_order_list.js"
order_js="ali/get_order.js"
confirm_js="ali/confirm_order.js"
login_js="ali/login.js"


def get_order_list(full=False):
    if not full: ret = run_casper (list_js)
    else:        ret = run_casper (list_js,["--full"])
    return ret

def get_order(ident):
    """ calculate for an order 
        "payment-time": "2014-07-11 01:32:35",
        "protection-reminder": {
            "hours": 3,
            "days": 14,
            "seconds": 50,
            "minutes": 50
        },

    run_casper raises exception if get_order failed.
    """
    ret = run_casper(order_js,[ident])
    rem =  ret['protection-reminder']
    if rem:
        now=datetime.now()
        #payment_time=datetime.strptime(ret["payment-time"],"%Y-%m-%d %H:%M:%S")
        prot_secs=rem["hours"]*60*60+rem["minutes"]*60+rem["seconds"]
        protection_timeout = timedelta(days=rem["days"],seconds=prot_secs)
        ret['protection-timeout'] = (datetime.now()+protection_timeout).strftime("%Y-%m-%d %H:%M:%S")
    del(ret['protection-reminder'])
    ret['type']='aliexpress'
    return ret

def confirm_order(ident,confirm_file):
    confirm = load_db(confirm_file)
    try:
        print(json.dumps(run_casper(confirm_js,[ident])))
    except:
        log.error("could not confirm order %s"%ident)

def login():
    return run_casper(login_js,[])
