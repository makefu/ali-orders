from splinter import Browser
import time
login_url="https://login.aliexpress.com/"
ali_home= "/home/makefu/.ali"
config=ali_home+'/config.json'
from core import load_config,save_db

config = load_config()
user_agent=config['user_agent']
with Browser(user_agent=user_agent) as browser: 
    aconf=config['ali']
    login_name=aconf['user_name']
    password=aconf['password']
    browser.visit(login_url)

    # give it a bit more time :)
    time.sleep(5)
    with browser.get_iframe('alibaba-login-box') as iframe:
        iframe.find_by_id('fm-login-id').fill(login_name)
        iframe.find_by_id('fm-login-password').fill(password)
        button = iframe.find_by_id('fm-login-submit')
        button.click()

    # we are at the main page again
    if browser.is_element_present_by_css('.nav-cart') :
        print("logged in!")
        save_db(browser.cookies.all(),aconf['cookie_file'])
    else:
        print("not logged in:(")
