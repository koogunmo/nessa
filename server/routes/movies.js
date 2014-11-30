'use strict';

var log4js		= require('log4js');


log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:movies');

module.exports = function(app,db,socket){

	var scanner	= plugin('scanner'),
		movies	= plugin('moviedata');

	app.get('/api/:session?/movies', function(req,res){
		// Get show list
		movies.list(function(error,results){
			if (error) {
				logger.error(error);
				return res.status(404).end();
			}
			if (results) return res.send(results);
		});
	//	movies.getHashes(118340, function(error, results){
	//		logger.debug(error, results);
	//	});
	})
	
	app.post('/api/:session?/movies', function(req,res){
		// Add movie to database
		movies.add(req.user, req.body.tmdb, function(error, result){
			movies.getHashes(result.tmdb);
			return res.status(201).end()
		});
	})
	
	app.get('/api/:session?/movies/:id', function(req,res){
		movies.get(req.user, req.params.id, function(error, result){
			if (error) return res.status(404).send(error);
			res.send(result);
		});
	})
	
	app.post('/api/:session?/movies/:id/download', function(req,res){
		logger.debug(req.body)
		// Download torrent
		movies.download(req.user, req.params.id, req.body, function(error,json){
			
		})
		res.status(201).send();
	})
	
	app.post('/api/:session?/movies/search', function(req,res){
		movies.search(req.user, req.body.q, function(error, results){
			if (error) return logger.error(error);
			res.send(results);
		});
	})
	
	app.get('/api/:session?/movies/unmatched', function(req,res){
		// Get list of unmatched movies
		movies.unmatched(function(error,results){
			if (error) {
				logger.error(error);
				return res.status(404).send(error);
			}
			if (results) return res.send(results);
		});
	})
	
	app.post('/api/:session?/movies/unmatched', function(req,res){
		// Save manual matches
		movies.match(req.body);
		return res.status(202).end();
	})
}