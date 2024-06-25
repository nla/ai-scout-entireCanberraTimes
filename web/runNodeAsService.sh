#!/bin/bash
umask 0002
echo "About to start entireCanberraTimes node as a service, shell is $0"
date
cd /home/kfitch/entireCanberraTimes/web
node app.js >> log-node 2>&1
echo "Ended entireCanberraTimes node as a service"
date
