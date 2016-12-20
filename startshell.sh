#!/bin/bash
function installNode {
    #cat /etc/*release* |grep ^NAME | head -n1 | awk -F '=' '{ print $2 }'
    #Ubuntu/Debian
    found=0
    if which apt > /dev/null ; then
        echo "Using apt packge manager. Ubuntu/Debian-ased distro"
        echo "Downloading DEB nodejs package"
        curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
        echo "Running sudo apt install -y nodejs"
        sudo apt install -y nodejs
        found=1
    fi
    if which yum > /dev/null ; then
        echo "Using YUM package manager"
        echo "Downloading RPM nodejs package"
        curl --silent --location https://rpm.nodesource.com/setup_7.x | bash -
        echo "Running sudo yum -y install nodejs"
        sudo apt yum -y install nodejs
        found=1
    fi
    if [ "$found" -eq 0 ]; then
        echo "It seems you're a using non-top APT/YUM based distro. Just install node on your own and re-run this script"
        exit 1
    fi
}

NODE_BIN=$(which node)
if which node > /dev/null ; then
    nv=$($NODE_BIN -v)
    echo "FOUND NODE " $nv
else
    echo "No nodejs found"
    installNode
fi

npm i
node server_api.js

