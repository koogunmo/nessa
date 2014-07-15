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
		var scanner	= plugin('scanner'),
			shows	= plugin('showdata');
		
		if (req.body.action){
			switch (req.body.action){
				case 'latest':
					// Check for new downloads
					break;
				case 'listings':
					// Update all show listings
					var showCollection = db.collection('show');
					showCollection.find({status: {$exists: true}}).toArray(function(error, results){
						results.forEach(function(show){
							shows.getArtwork(show.tvdb);
							shows.getProgress(show.tvdb);
							shows.getFullListings(show.tvdb, function(error, tvdb){
								shows.getHashes(show.tvdb);
							});
						});
					});
					break;
				case 'rescan':
					// Rescan media
					scanner.shows(function(error, tvdb){
						shows.getFullListings(tvdb, function(error, tvdb){
							shows.getHashes(tvdb);
							scanner.episodes(tvdb);
						});
					});
					break;
				case 'restart':
					system.restart();
					break;
				case 'update':
					system.update();
					break;
			}
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