#!/usr/bin/python
"""usage:
    cli            confirm-order       <order-ids>... [options] 
    cli            set-confirm-date    <order-id> [--date=DATE] [options] [--force]
    cli            get-open-orders     [--detailed] [options] 
    cli            get-all-orders      [--detailed] [options] 
    cli (ali|ebay) login               [options]
    cli (ali|ebay) refresh-open-orders [--noconfirm] [options]
    cli (ali|ebay) refresh-order-list  [--full] [options]
    cli (-h | --help | --version)

Arguments:
    order-ids           one or many order ids
    --full              all order pages or just the first one
    --noconfirm         do not confirm found orders
    --date=<date>       Date in format YYYY-MM-DD[ HH:MM[:SS]]

Options:
    --db=FILE           path to database [default: ~/.ali/db.json]
    --confirm-db=FILE   path to confirm date database [default: ~/.ali/confirm.json]
    -l,--log=LOL        specify python Log Level [default: WARN]
"""
import logging
import logging as log
logging.basicConfig(level=logging.INFO)
log = logging.getLogger('cli')

from docopt import docopt
import sys,json,os.path
from core import prepare_home,load_db,save_db,set_confirm_date,cleanup_name,log as core_log
import ali
from datetime import datetime,timedelta

ali_home=None

def confirm_order(order,order_db,confirm_db):
    db = load_db(order_db)
    try:
        o= db[order]
        if o['type'] == 'ali':
            ali.confirm_order(order)
        elif o['type'] == 'ebay':
            ebay.confirm_order(order)
        else:
            log.error("no such type '%s' for order %i"%(o['type'],order))
        set_confirm_date(order,datetime.now(),order_db,confirm_db)
         
    except Exception as e:
        log.error(e)
        raise

def get_order(ident,typ):
    """ will not handle get_order exceptions"""
    ret = {}

    if typ == "ali":
        ret = ali.get_order(ident)
    elif typ == "ebay":
        ret= ebay.get_order(ident)
    else:
        raise Exception ("no such typ %s"%typ)
    if not ret:
        raise Exception("empty order returned!")
    ret['type']=typ
    return ret

def get_order_link(order):
    typ=order['type']
    ident=order['_id']
    if typ == "ali":
        return ali.get_order_link(ident)
    elif typ == "ebay":
        return ebay.get_order_link(ident)
    else:
        raise Exception ("no such typ %s"%typ)

def print_detailed_order(v):
    print("%s via %s ($%5.2f) @%s - %s"%( v['order-time'].split()[0],
        v['seller']['name'],v['total-amount'],v['type'],get_order_link(v)
        ))
    for product in v['products'].values():
        print("  %s"%( cleanup_name(product['title'])
                                  ))
        print("  $%5.2f (%d PCS @ $%.2f) - %s"%
                (   product['price'], product['quantity'],
                    product['price-per-piece'],product['trade-status']
                    ))
        #print("    %s"%product['link'])


def print_short_order(v):
    name=cleanup_name(v["products"].popitem()[1]["title"])
    amount=v["total-amount"]
    try:
        since=(datetime.now() - \
            datetime.strptime(v["payment-time"],"%Y-%m-%d %H:%M:%S")).days
    except:
        since=-1

    try:
        protect=( datetime.strptime(v["protection-timeout"],"%Y-%m-%d %H:%M:%S") -
            datetime.now()).days
    except:
        protect=-1
    ident=v["_id"]
    print("$%5.2f - %s"%(amount,name))
    print("         %d days, protection ends in %d days, ID %d"%(since,protect,ident))

def get_open_orders(filename,detailed):
    db= load_db(filename)
    for k,v in sorted(db.items(),key=lambda x:x[1]["payment-time"],reverse=True):
        if v["order-status"] in ("Finished","Closed","Fund Processing"):
            pass
        else:
            if detailed:
                print_detailed_order(v)
            else:
                print_short_order(v)

def get_all_orders(filename,detailed):
    db= load_db(filename)
    for k,v in sorted(db.items(),key=lambda x:x[1]["payment-time"],reverse=True):
        if detailed:
            print_detailed_order(v)
        else:
            print_short_order(v)
            #log.debug((json.dumps(v,indent=4)))

    #print(json.dumps(db,indent=4))



def retry_get_order(k,typ):
    """ TODO: retry more than once?"""
    tries=2
    while tries:
        try:
            return get_order(k,typ)
        except Exception as e:
            tries-=1
            log.warn("%s failed, retries remaining %d"%(k,tries))
            log.error(e)
    raise Exception("Number Retries reached, bailing out")

def new_orders_to_file(db_file,typ,full=False):
    db = load_db(db_file)
    if typ == "ali":
        ret = ali.get_order_list(full)
    elif typ == "ebay":
        ret= ebay.get_order_list(full)
    else:
        raise Exception ("no such typ %s"%typ)

    changed=False
    for k in ret:
        if not( str(k) in db):
            log.info("adding new order %s to db"%k)
            db[k] = {'type':typ}
            changed=True
    if not changed:
        log.info("nothing changed")
    else:
        save_db(db,db_file)


def refresh_open_orders(db_file,confirm_file,typ,clean=False,confirm=True):
    data = load_db(db_file)
    for k in data:
        #log.debug(json.dumps(data,indent=4))
        #log.debug(data)
        if not '_id' in data[k]:
            log.debug("found empty data %s"%k)
            try:
                data[k] = retry_get_order(k,typ)
            except Exception as e:
                log.error("cannot update order %s, not logged in?"%k)
                log.error(e)
        elif not (data[k]["order-status"] in ( "Finished", "Closed" )):
            log.info("refreshing id %s - status %s" % \
                    (k,data[k]["order-status"]))
            try:
                data[k] = retry_get_order(k,typ)
            except Exception as e:
                log.error("cannot update order %s, not logged in?"%k)
                log.error(e)
            #log.debug(json.dumps(data[k],indent=4))
            if data[k]["order-status"] == "Finished" and confirm:
                log.debug("Order Status Changed from Shipped to Finished")
                try:
                    set_confirm_date(k,datetime.now(),db_file,confirm_file)
                except Exception as e:
                    log.warn("could not confirm order %s with new order date %s"%(k,datetime.now()))

        else:
            log.debug("will not refresh id %s"%k)
    save_db(data,db_file)


if __name__ == "__main__":
    args = docopt(__doc__,version="0.krebs")
    
    # configure log level
    lol=args["--log"]
    numeric_level = getattr(logging,lol.upper(),None)
    if not isinstance(numeric_level,int):
        log.error("No such log level %s"%lol)
        print(__doc__)
        sys.exit(1)
    logging.basicConfig(level=numeric_level)
    log.setLevel(numeric_level)
    core_log.setLevel(numeric_level)
    log.debug("Log Level configured to debug")
    #log.debug(json.dumps(args,indent=4))
    ali_home= prepare_home()
    if args["ali"]:
        if args["login"]:
            ali.login()
            log.info("Successfully logged in")
        elif args["refresh-open-orders"]:
            db=os.path.expanduser(args['--db'])
            confirm_db=os.path.expanduser(args['--confirm-db'])
            confirm= not args['--noconfirm']
            if not confirm: log.info("Will not set confirm date for new orders")
            try:
                refresh_open_orders(db,confirm_db,'ali',confirm=confirm)
            except Exception as e:
                from traceback import format_exc
                log.error("Refreshing orders failed, try to login first")
                log.error(format_exc())
                log.error(e)

                sys.exit(1)
        elif args["refresh-order-list"]:
            db=os.path.expanduser(args['--db'])
            new_orders_to_file(db,'ali',args["--full"])

    elif args["confirm-order"]:
        confirm_db=os.path.expanduser(args['--confirm-db'])
        db=os.path.expanduser(args['--db'])
        for i in args["<order-ids>"]:
            log.debug("confirming order %s"%i)
            confirm_order(i,db,confirm_db)

    elif args["get-open-orders"]:
        db=os.path.expanduser(args['--db'])
        get_open_orders(db,args['--detailed'])

    elif args["get-all-orders"]:
        db=os.path.expanduser(args['--db'])
        get_all_orders(db,args['--detailed'])

    elif args["set-confirm-date"]:
        ident=args["<order-id>"]
        if args["--date"]:
            try: date=datetime.strptime(args["--date"],"%Y-%m-%d")
            except: 
                try: date=datetime.strptime(args["--date"],"%Y-%m-%d %H:%M")
                except: date=datetime.strptime(args["--date"],"%Y-%m-%d %H:%M:%S")
        else:
            date=datetime.now()

        log.info("set confirmation date for %s to %s"%(ident,date.strftime("%Y-%m-%d")))
        db=os.path.expanduser(args['--db'])
        confirm=os.path.expanduser(args['--confirm-db'])
        set_confirm_date(ident,date,db,confirm)
    sys.exit()
