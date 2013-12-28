#!/bin/bash

## Install required stuff

sudo apt-get -y avahi-daemon gcc g++ make python python-software-properties unattended-upgrades

## Add mongodb repository

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
sudo echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list

## Add node.js and Transmission PPA repositories

sudo add-apt-repository -y ppa:chris-lea/node.js
sudo add-apt-repository -y ppa:transmissionbt/ppa

## Install libraries

sudo apt-get update
sudo apt-get install -y mongodb-10gen nodejs transmission git
sudo npm -g install nodemon forever

## Fetch NodeTV

sudo mkdir /opt/nodetv
sudo chown media:media /opt/nodetv
git clone https://github.com/greebowarrior/nessa.git /opt/nodetv

## Install minidlna

sudo apt-get install libavcodec52 libavformat54 libavutil52 libc6 libexif12 libflac8 libid3tag0 libjpeg8 libogg0 libsqlite3-0 libvorbis0a

# to do


## Add Upstart script

sudo cp /opt/nodetv/scripts/upstart.conf /etc/init/nodetv.conf
sudo initctl reload-configuration

## Install node modules

echo export NODE_ENV=production >> ~/.bash_profile
source ~/.bash_profile

chdir /opt/nodetv
npm install
npm link npm

## Start NodeTV

sudo service nodetv start