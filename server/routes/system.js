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
	
	var movies	= plugin('moviedata'),
		system	= require('nodetv-system'),
		scanner	= plugin('scanner'),
		shows	= plugin('showdata');
	
	var episodeCollection = db.collection('episode'),
		showCollection = db.collection('show'),
		userCollection = db.collection('user');
	
	app.get('/api/:session?/system/settings', function(req,res){
		res.send(nconf.get());
	}).get('/api/:session?/system/status', function(req,res){
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
	})
	
	app.post('/api/:session?/system/settings', function(req,res){
		for (var i in req.body){
			nconf.set(i, req.body[i]);
		}
		nconf.save(function(error){
			if (error){
				res.status(400).end()
			} else {
				res.status(200).end()
			}
		});
	}).post('/api/:session?/system/restart', function(req,res){
		socket.emit('alert', {message:'Restarting...',type:'warn'});
		system.restart();
	}).post('/api/:session?/system/update', function(req,res){
		socket.emit('alert', {message:'Updating...',type:'warn'});
		system.update();
	})
	
	/*
	app.post('/api/:session?/rebuild/movies/genres', function(req,res){
		movies.rebuildGenres();
		res.status(202).end();
	})
	
	*/
	
	/* These should be moved to their related route files */
	
	app.post('/api/:session?/rebuild', function(req,res){
		if (req.body.type){
			switch(req.body.type){
				case 'movies':
					movies.clearSymlinks(function(){
						movies.sync(req.user, function(error, result){
							if (result.library) {
								movies.scan(req.user, function(error, tmdb){
									if (error) logger.error(error);
									if (tmdb){
										movies.getArtwork(tmdb);
										movies.getHashes(tmdb);
									}
								});
							}
						});
					});
					break;
				case 'shows':
					break;
			}
		}
		res.status(202).end();
	}).post('/api/:session?/rescan', function(req,res){
		if (req.body.type){
			switch (req.body.type){
				case 'movies':
					movies.sync(req.user, function(error, result){
						if (error) logger.error(error);
						if (result.library) {
							movies.scan(req.user, function(error, tmdb){
								if (error) logger.error(error)
								if (tmdb){
									movies.getArtwork(tmdb);
									movies.getHashes(tmdb);
								}
							});
						}
					});
					break;
				case 'shows':
				default:
					/* TODO
					shows.sync(req.user, function(error, count){
						shows.scan(req.user, function(error, tvdb){
							shows.getHashes();
						});
					})
					*/
					scanner.shows(req.user, function(error, tvdb){
						shows.getFullListings(tvdb, function(error, tvdb){
							shows.getHashes(tvdb);
							scanner.episodes(req.user, tvdb);
						});
					});
			}
		}
		res.status(202).end();
		
	}).post('/api/:session?/system', function(req,res){
		
		// TODO: this is horrific... What the hell was I thinking!
		
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
					showCollection.find({status: true}, {tvdb:1}).toArray(function(error, results){
						if (error) return logger.error(error);
						if (results.length){
							results.forEach(function(show){
								shows.getSummary(show.tvdb, function(error){
									shows.getFullListings(show.tvdb, function(error, tvdb){
										shows.getHashes(show.tvdb);
									});
									shows.getArtwork(show.tvdb);
									shows.getProgress(req.user, show.tvdb); // Only updates for the current user
								})
							});
							
						}
					});
					break;
				case 'rescan':
					// Rescan media
					scanner.shows(req.user, function(error, tvdb){
						shows.getFullListings(tvdb, function(error, tvdb){
							shows.getHashes(tvdb);
							scanner.episodes(req.user, tvdb);
						});
					});
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
		res.status(202).end();
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