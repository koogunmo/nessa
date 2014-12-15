#!/bin/bash

## Install required stuff

sudo apt-get -y install avahi-daemon gcc g++ make python python-software-properties unattended-upgrades

## Add mongodb repository

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
sudo echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list

## Add node.js and Transmission PPA repositories

sudo add-apt-repository -y ppa:chris-lea/node.js
sudo add-apt-repository -y ppa:transmissionbt/ppa

## Install libraries

sudo apt-get update
sudo apt-get install -y mongodb-10gen nodejs transmission-daemon git
sudo npm -g install nodemon forever

## Fetch NodeTV

sudo mkdir /opt/nodetv
sudo chown media:media /opt/nodetv
git clone https://github.com/greebowarrior/nessa.git /opt/nodetv

## Create a user and group

sudo groupadd media
sudo useradd -g media -G debian-transmission -m media

sudo mkdir /home/media/Torrents
sudo mkdir -p /home/media/Videos/TV\ Shows
sudo chown -R media:media /home/media/Videos
sudo chown media:debian-transmission /home/media/Torrents
sudo chmod -R 0775 /home/media

## Add Upstart script

sudo cp /opt/nodetv/scripts/upstart/nodetv.conf /etc/init/nodetv.conf
sudo ln -s /lib/init/upstart-job /etc/init.d/nodetv
sudo update-rc.d nodetv defaults
sudo initctl reload-configuration

## Install node modules

echo export NODE_ENV=production >> ~/.bash_profile
source ~/.bash_profile

chdir /opt/nodetv
npm install
sudo npm link npm

## Start NodeTV

sudo service nodetv start

## Install nginx

sudo apt-get install -y nginx

