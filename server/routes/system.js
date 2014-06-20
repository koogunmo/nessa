'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:system');

module.exports = function(app){
	
	var system	= require('nodetv-system');
	
	app.get('/api/system/settings', function(req,res){
		res.send(nconf.get());
	}).post('/api/system/settings', function(req,res){
		for (var i in json) {
			nconf.set(i, json[i]);
		}
		nconf.save(function(error){
			if (error) {
				/*
				socket.emit('system.alert', {
					type: 'danger',
					message: 'Settings were not saved'
				});
				*/
				res.send(400);
				return;
			}
			res.send(200);
			/*
			socket.emit('system.alert', {
				type: 'success',
				message: 'Settings saved',
				autoClose: 2500
			});
			// Update media path
			if (!nconf.get('listen:nginx')){
				app.use('/media', express.static(nconf.get('media:base')));
			}
			*/
		});
	}).post('/api/system', function(req,res){
		if (req.body.action){
			switch (req.body.action){
				case 'latest':
					break;
				case 'listings':
					break;
				case 'rescan':
					break;
				case 'restart':
					system.restart();
					break;
				case 'update':
					system.update();
					break;
			}
			console.log(req.body.action);
		}
	});
	
	app.get('/api/system/status', function(req,res){
		var df = require('node-df');
		df(function(error, disks){
			var usage = [];
			var ignore = ['/boot','/dev','/net','/var','/Volumes/MobileBackups']
			disks.forEach(function(disk){
				// Hide filesystems smaller than 2GB, and volatile filesystems
				if (ignore.indexOf(disk.mount) >= 0 || disk.size <= 2097152) return;
				usage.push(disk);
			});
			
			res.send({
				disks: usage,
				system: {
					arch: process.arch,
					node: process.version,
					platform: process.platform
				},
				uptime: process.uptime(),
				version: pkg.version
			});
		});
	});
};