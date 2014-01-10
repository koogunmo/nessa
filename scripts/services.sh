#!/bin/bash

# Amazon S3

wget -O- -q http://s3tools.org/repo/deb-all/stable/s3tools.key | sudo apt-key add -
wget -O/etc/apt/sources.list.d/s3tools.list http://s3tools.org/repo/deb-all/stable/s3tools.list
apt-get update && apt-get install s3cmd


# Netatalk
echo "Installing Netatalk"
apt-get install avahi-daemon build-essential libssl-dev libgcrypt11-dev libkrb5-dev libpam0g-dev libwrap0-dev libdb-dev libavahi-client-dev libacl1-dev libcrack2-dev libdbus-1-dev libdbus-glib-1-dev libglib2.0-dev libevent-dev

wget http://prdownloads.sourceforge.net/netatalk/netatalk-3.1.0.tar.bz2 -O netatalk-3.1.0.tar.bz2
tar xf netatalk-3.1.0.tar.bz2
cd netatalk-3.1.0/

./configure --with-init-style=debian --without-libevent --with-pam-confdir=/etc/pam.d --with-dbus-sysconf-dir=/etc/dbus-1/system.d --enable-zeroconf --enable-quota --with-cracklib
make && make install
cd ..

echo "Netatalk installed"


# MiniDLNA
echo "Installing MiniDLNA"
apt-get install autoconf gettext sqlite3 libavutil-dev libavcodec-dev libjpeg-dev libflac-dev libid3tag0-dev libavformat-dev libexif-dev libsqlite3-dev libvorbis-dev

wget http://prdownloads.sourceforge.net/minidlna/minidlna-1.1.0.tar.gz -O minidlna-1.1.0.tar.gz
tar xf minidlna-1.1.0.tar.gz
cd minidlna-1.1.0/

./configure
make && make install
cd ..

cp config/minidlna.conf /usr/local/etc/minidlna.conf
cp upstart/minidlna.conf /etc/init/minidlna.conf
ln -s /etc/init.d/minidlna /lib/init/upstart-job
update-rc.d minidlna defaults
initctl reload-configuration

service minidlna start