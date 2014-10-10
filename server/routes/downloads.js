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
	
	app.get('/api/:session?/downloads', function(req,res){
		// List torrents
		torrents.list(function(error, data){
		//	logger.info(data);
			if (error) return console.error(error);
			res.send(data.torrents);
		});
			
	}).post('/api/:session?/downloads', function(req,res){
		// Add new torrent
		if (req.body.url){
			torrents.add(req.body.url, function(error, data){
				if (error) return logger.error(error);
			});
			res.status(202).end();
		}
	});
	
	app.get('/api/:session?/downloads/:id', function(req,res){
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
		
		
	}).post('/api/:session?/downloads/:id', function(req,res){
		// Update torrent settings (i.e. ratio)
		
	}).delete('/api/:session?/downloads/:id', function(req,res){
		// Remove torrent
		torrents.remove({id: req.params.id, purge: true}, function(error){
			if (error) return logger.error(error);
			res.status(204).end();
		});
	});
	
	
	
	
};