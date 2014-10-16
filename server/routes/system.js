'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:system');

module.exports = function(app,db,socket){
	
	var system	= require('nodetv-system'),
		scanner	= plugin('scanner'),
		shows	= plugin('showdata');
	
	var episodeCollection = db.collection('episode'),
		showCollection = db.collection('show'),
		userCollection = db.collection('user');
	
	app.get('/api/:session?/system/settings', function(req,res){
		res.send(nconf.get());
		
	}).post('/api/:session?/system/settings', function(req,res){
		/*
		for (var i in json) nconf.set(i, json[i]);
		
		nconf.save(function(error){
			if (error) {
				res.status(400).end();
				return;
			}
			res.status(200).end();
		});
		*/
	}).post('/api/:session?/system', function(req,res){
		
		if (req.body.action){
			switch (req.body.action){
				case 'clean':
					shows.sanitize();
					break;
				case 'latest':
					// Check for new downloads
					break;
				case 'listings':
					// Update all show listings
					showCollection.find({status: true}).toArray(function(error, results){
						if (error) return logger.error(error);
						if (results.length){
							results.forEach(function(show){
								shows.getArtwork(show.tvdb);
								shows.getProgress(req.user, show.tvdb); // Only updates for the current user
								shows.getFullListings(show.tvdb, function(error, tvdb){
									shows.getHashes(show.tvdb);
								});
							});
						}
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
					
				case 'upgrade':
					// Update DB to 0.8 format
					episodeCollection.update({}, {$unset: {watched: true}}, {multi:true, w:0});
					showCollection.update({}, {$unset: {seasons:true, progress:true}}, {multi:true, w:0});
					userCollection.update({}, {$unset: {session: true, lastTime: true}}, {multi:true, w:0});
					// Add users to all enabled shows
					userCollection.findOne({_id: ObjectID(req.user._id)}, {_id:1,username:1}, function(error, user){
						if (error) return logger.error(error);
						if (user) showCollection.update({status: {$exists: true}, users: {$exists: false}}, {$push: {users: user}}, {multi:true, w:0});
					});
					break;
			}
		}
	});
	
	app.get('/api/:session?/system/status', function(req,res){
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