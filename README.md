# Ali Orders

This project dumps aliexpress and ebay orders into a json format.
Unfortunately nothing works anymore as their web api stopped working.

This project is provided AS IS, for you to do what you want to with it.

# Install

    
    npm install -g casperjs phantomjs mongodb
    pip install docopt
    mkdir ~/.ali
    cp config.json.sample ~/.ali/config.json
    # edit config.json - may not be used, better edit the js files :D
    # edit ali/ali/login.js
    # edit ali/ebay/login.js

# usage:

    # cop
    python ali/cli.py --help


# Copying

see COPYING
