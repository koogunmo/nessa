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
		shows	= plugin('showdata'),
		system	= require('nodetv-system');
	
	var episodeCollection = db.collection('episode'),
		showCollection = db.collection('show'),
		userCollection = db.collection('user');
	
	app.get('/api/system/settings', function(req,res){
		res.send(nconf.get());
		
	}).get('/api/system/status', function(req,res){
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
	
	app.post('/api/system/settings', function(req,res){
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
	}).post('/api/system/restart', function(req,res){
		socket.emit('alert', {message:'Restarting...',type:'warn'});
		system.restart();
	}).post('/api/system/update', function(req,res){
		socket.emit('alert', {message:'Updating...',type:'warn'});
		system.update();
	}).post('/api/system/upgrade', function(req,res){
		// Update DB to 0.8 format
		episodeCollection.update({}, {$unset: {watched: true}}, {multi:true, w:0});
		showCollection.update({}, {$unset: {seasons:true, progress:true}}, {multi:true, w:0});
		userCollection.update({}, {$unset: {session: true, lastTime: true}}, {multi:true, w:0});
		// Add users to all enabled shows
		userCollection.findOne({_id: ObjectID(req.user._id)}, {_id:1,username:1}, function(error, user){
			if (error) return logger.error(error);
			if (user) showCollection.update({status: {$exists: true}, users: {$exists: false}}, {$push: {users: user}}, {multi:true, w:0});
		});
		
		res.status(202).end();
	})
};