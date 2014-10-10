'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:shows');

module.exports = function(app, db, socket){
	
	var scanner	= plugin('scanner'),
		shows	= plugin('showdata');
		
	app.get('/api/:session?/shows', function(req,res){
		shows.list(req.user, function(error,results){
			if (error) logger.error(error);
			if (results){
				res.send(results);
			} else {
				res.status(404).end();
			}
		});
		
	}).post('/api/:session?/shows', function(req,res){
		// Add new show
		if (req.body.tvdb){
			var tvdb = parseInt(req.body.tvdb, 10)
			shows.add(req.user, tvdb, function(error, tvdb){
				shows.getArtwork(tvdb);
				shows.getSummary(tvdb, function(error, tvdb){
					shows.getFullListings(tvdb, function(error, tvdb){
						shows.getHashes(tvdb);
					})
				});
				res.status(201).end();
			});
		}
	});
	
	app.get('/api/:session?/shows/unmatched', function(req,res){
		shows.unmatched(function(error, json){
			res.send(json);
		});
		
	}).post('/api/:session?/shows/match', function(req,res){
		shows.match(req.body.matched, function(error, tvdb){
			shows.getSummary(tvdb, function(error, tvdb){
				shows.getArtwork(tvdb);
				shows.getFullListings(tvdb, function(error, tvdb){
					shows.getHashes(tvdb)
					scanner.episodes(tvdb);
				});
			});
		});
	});
	
	app.post('/api/:session?/shows/search', function(req,res){
		// Search Trakt for a show
		shows.search(req.user, req.body.q, function(error, results){
			res.send(results);
		});
	});
	
	app.get('/api/:session?/shows/:id', function(req,res){
		// Get show details
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.summary(req.user, tvdb, function(error, json){
				if (error) logger.error(error);
				res.send(json);
			});
		} else {
			res.send(404);
		}
	}).post('/api/:session?/shows/:id', function(req,res){
		// Update show
		shows.settings(req.user, req.body, function(error){
			if (error){
				logger.error(error);
				res.status(400).end();
				return;
			}
			res.status(200).end();
		});
	}).delete('/api/:session?/shows/:id', function(req,res){
		// Delete show
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.remove(req.user, tvdb, function(error, response){
				if (error){
					logger.error(error);
					res.status(400).end();
					return;
				}
				res.status(204).end();
			});
		}
	});

	app.get('/api/:session?/shows/:id/progress', function(req,res){
		// Get show details
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.progress(req.user, tvdb, function(error, json){
				if (error) return logger.error(error);
				res.send(json);
			});
		} else {
			res.send(404);
		}
	});
	
	app.get('/api/:session?/shows/:id/update', function(req,res){
		// Update show data
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.getArtwork(tvdb);
			shows.getSummary(tvdb);
			shows.getProgress(req.user, tvdb);
			shows.getFullListings(tvdb, function(error, tvdb){
				if (error) logger.error(error);
				shows.getHashes(tvdb);
			});
			res.status(202).end();
		} else {
			res.status(400).end();
		}
		
	}).get('/api/:session?/shows/:id/rescan', function(req,res){
		// Rescan local files
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			scanner.episodes(tvdb);
			res.status(202).end();
		} else {
			res.status(400).end();
		}
	});
	
	// Watched
	app.post('/api/:session?/shows/:id/watched', function(req,res){
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.watched(req.user, tvdb, req.body);
		}
		res.status(204).end();
	});
	
	// Downloads (Manual)
	app.post('/api/:session?/shows/:id/download', function(req,res){
		var status = 400;
		if (req.body.tvdb){
			var tvdb = parseInt(req.body.tvdb, 10);
			if (req.body.season) {
				if (req.body.episode) {
					// Download selected episode
					status = 202;
				} else {
					// Download entire season
					status = 202;
				}
			} else {
				// Download all available episodes
				status = 202;
			}
		}
		res.status(status).end();
	});
	
	// Matching
	
}