#!/usr/bin/python

import os.path as p
import os,json
import sys
import logging 
log = logging.getLogger('ali_core')

def prepare_home():
    ali_home = p.expanduser("~")+"/.ali"
    if not p.exists(ali_home):
        try: os.mkdir(ali_home)
        except:
            log.error("cannot create working directory '%s'"%ali_home)
            raise Exception("failed to create working directory")
    if not os.access(ali_home,os.W_OK) or not p.isdir(ali_home):
        log.error("directory not writeable or not a directory '%s'"%ali_home)
        raise Exception("cannot access ali_home")

    return ali_home

def load_db(fn):
    try:
        with open(fn,"r+") as f:
            db=json.load(f)
            log.debug("successfully loaded db from %s"%fn)
    except IOError as e:
        log.warn("cannot load old db, creating a new one")
        db={}
    except:
        log.error("Cannot load old db, something is really wrong!")
        raise

    return db

def save_db(db,fn):
    with open(fn,"w+") as f:
        json.dump(db,f)
        log.debug("sucessfully written to %s"%fn)

def run_casper(f,args=None):
    if not args: args = []
    from subprocess import Popen,PIPE
    #c = json.loads(Popen(["casperjs"]+[f] +args,stdout=PIPE,stderr=PIPE).communicate()[0].decode())
    cmd=["casperjs"]+[f] +args
    log.debug("running %s" % (cmd))
    proc= Popen(cmd,stdout=PIPE,stderr=PIPE)
    for line in proc.stderr:
        log.debug("casper:%s"%line.decode().strip())

    #c = json.loads(proc.communicate()[0].decode())
    j = proc.communicate()[0].decode()
    try: 
        c = json.loads(j)
    except:
        log.error("could not parse output of casperjs: '%s'"%j)
        raise
    if proc.returncode != 0:
        raise Exception("%s failed"%cmd)
    return c


def cleanup_name(name):
    import re
    name = re.sub(r"(?i)free shipping",'',name)
    name = re.sub(r"(?i)(best|good) quality",'',name)
    name = re.sub(r"^[,.!?_-]",'',name)
    name = re.sub(r"[,.!?_-]$",'',name)
    name = name.strip()
    return name


def set_confirm_date(ident,date,db_file,confirm_file):
    db = load_db(db_file)
    confirm = load_db(confirm_file)

    if not ident in db:
        log.warn("%s is not in the order database, continuing anyway")

    if ident in confirm:
        log.error("%s already in db with '%s'!"%(ident,confirm[ident]))
        raise Exception("%s already in db with '%s'!"%(ident,confirm[ident]))
    fdate = date.strftime("%Y-%m-%d %H:%M:%S")
    log.debug("set %s to '%s'"%(ident,fdate))
    confirm[ident] = fdate
    save_db(confirm,confirm_file)

