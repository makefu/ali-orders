default_ali_home="/home/makefu/.ali"
modules=('ali','ebay')
import json
import os.path 


def save_db(db,f):
    f = os.path.expanduser(f)
    with open(f,'w+') as g:
        json.dump(db,g)

def load_db(f):
    f = os.path.expanduser(f)
    with open(f) as g:
        return json.load(g)

def load_config(config_file=None):
    from os.path import dirname
    if not config_file:
        config_file=default_ali_home+"/config.json"

    ret = load_db(config_file)
    ret['config_file'] = config_file
    if not 'home' in ret:
        ret['home']=dirname(config_file)
    for i in modules:
        if not i in ret: ret[i]={}
        if not 'cookie_file' in ret[i]:
            ret[i]['cookie_file'] =  '{}/{}.cookies'.format(ret['home'],i)
    return ret
