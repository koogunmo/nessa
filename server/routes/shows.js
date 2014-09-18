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
	
	/*
	app.get('/api/dashboard/latest', function(req,res){
		shows.latest(function(error, json){
			res.send(json);
		});
	}).get('/api/dashboard/upcoming', function(req,res){
		trakt.calendar.shows(function(error, json){
			res.send(json);
		});
	});
	*/
	
	app.get('/api/shows', function(req,res){
		// Get show list
//		var session = req.param('session');
		
		shows.list(function(error,results){
			if (error) console.error(error);
			if (results){
				res.send(results);
			} else {
				res.status(404).end();
			}
		});
	}).post('/api/shows', function(req,res){
		// Add new show
		if (req.body.tvdb){
			var tvdb = parseInt(req.body.tvdb, 10)
			shows.add(tvdb, function(error, tvdb){
				shows.getArtwork(tvdb);
				shows.getSummary(tvdb, function(error, tvdb){
					shows.getFullListings(tvdb, function(error, tvdb){
						shows.getHashes(tvdb);
					})
				});
				/*
				socket.emit('system.alert', {
					type: 'success',
					message: 'Show added',
					autoClose: 2500
				});
				*/
				res.status(201).end();
			});
		}
	});
	
	app.get('/api/shows/unmatched', function(req,res){
		shows.unmatched(function(error, json){
			res.send(json);
		});
		
	}).post('/api/shows/match', function(req,res){
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
	
	app.post('/api/shows/search', function(req,res){
		// Search Trakt for a show
		shows.search(req.body.q, function(error, results){
			res.send(results);
		});
	});
	
	app.get('/api/shows/:id', function(req,res){
		// Get show details
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.summary(tvdb, function(error, json){
				if (error) console.error(error);
				res.send(json);
			});
		} else {
			res.send(404);
		}
	}).post('/api/shows/:id', function(req,res){
		// Update show
		shows.settings(req.body, function(error){
			if (error){
				console.error(error);
				/*
				socket.emit('system.alert', {
					type: 'danger',
					message: 'Show settings not updated'
				});
				*/
				res.status(400).end();
				return;
			}
			/*
			socket.emit('system.alert', {
				type: 'success',
				message: 'Show settings updated',
				autoClose: 2500
			});
			*/
			res.status(200).end();
		});
	}).delete('/api/shows/:id', function(req,res){
		// Delete show
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.remove(tvdb, function(error, response){
				if (error){
					console.error(error);
					res.status(400).end();
					return;
				}
				/*
				socket.emit('system.alert', {
					type: 'success',
					message: 'Show removed',
					autoClose: 2500
				});
				*/
				res.status(204).end();
			});
		}
	});
	
	app.get('/api/shows/:id/update', function(req,res){
		// Update show data
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			shows.getArtwork(tvdb);
			shows.getSummary(tvdb);
			shows.getProgress(tvdb);
			shows.getFullListings(tvdb, function(error, tvdb){
				if (error) console.error(error);
				shows.getHashes(tvdb);
			});
			res.status(202).end();
		} else {
			res.status(400).end();
		}
	}).get('/api/shows/:id/download', function(req,res){
		// Download all missing episodes
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			
			console.log(tvdb);
			
		//	shows.downloadAll(tvdb);
			res.status(202).end();
		} else {
			res.status(400).end();
		}
	}).get('/api/shows/:id/rescan', function(req,res){
		// Rescan local files
		if (req.params.id){
			var tvdb = parseInt(req.params.id, 10);
			scanner.episodes(tvdb);
			/*
			socket.emit('system.alert', {
				type: 'info',
				message: 'Show rescan in progress',
				autoClose: 2500
			});
			*/
			res.status(202).end();
		} else {
			res.status(400).end();
		}
	});
	
	// Matching
	
	// Watched
	
	// Downloads (Manual)
	
}