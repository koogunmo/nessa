'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:downloads');

module.exports = function(app, db, socket){
	
	var torrents	= plugin('transmission');
	
	app.get('/api/downloads', function(req,res){
		// List torrents
		torrents.list(function(error, data){
			if (error) {
				console.error(error);
				return;
			}
			res.send(data.torrents);
		});
			
	}).post('/api/downloads', function(req,res){
		// Add new torrent
		if (req.body.url){
			torrents.add(url, function(error, data){
				if (error) {
					logger.error(error);
					return;
				}
				/*
				socket.emit('system.alert', {
					type: 'success',
					message: 'Torrent added',
					autoClose: 1500
				});
				*/
				res.status(201).end();
			});
		}
	});
	
	app.get('/api/downloads/:id', function(req,res){
		// Get torrent info
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		torrents.info(parseInt(id, 10), function(error, data){
			try {
				var torrent = data.torrents[0];
				var response = {
					id: torrent.id,
					status: !!torrent.status,
					hash: torrent.hashString,
					date: {
						started: torrent.addedDate
					},
				};
				episodeCollection.findOne({hash: torrent.hashString.toUpperCase()}, function(error, results){
					if (results) {
						// In DB, no manual move required
						response.episode = results;
						showCollection.findOne({tvdb: results.tvdb}, function(error, show){
							response.show = show;
							res.send(response);
						});
					} else {
						response.files = [];
						torrent.files.forEach(function(file){
							response.files.push(file);
						});
						res.send(response);
					}
				});
			} catch(e){
				logger.error(e.message);
			}
		});
		
		
	}).post('/api/downloads/:id', function(req,res){
		// Update torrent settings (i.e. ratio)
		
	}).delete('/api/downloads/:id', function(req,res){
		// Remove torrent
		torrents.remove({id: req.params.id, purge: true}, function(error){
			if (!error) {
				/*
				socket.emit('system.alert', {
					type: 'success',
					message: 'Torrent deleted',
					autoClose: 2500
				});
				*/
				res.status(204).end();
			}
		});
	});
	
	
	
	
};