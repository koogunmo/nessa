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
	
	var shows	= require('nodetv-shows');
	
	app.get('/api/shows', function(req,res){
		shows.list(req.user).then(function(results){
			res.send(results);
		}, function(error){
			res.status(404).end();
		});
	}).post('/api/shows', function(req,res){
		// Add new show
		shows.add(req.user, req.body.imdb).then(function(show){
			socket.emit('alert', {'title':'Show added','message':show.name});
			
			shows.getArtwork(show.imdb);
			shows.getSummary(show.imdb);
			shows.getListings(show.imdb).then(function(imdb){
				shows.getHashes(show.imdb);
			});
			res.status(201).end();
		}, function(error){
			logger.error(error);
			res.status(404).end();
		});
	})
	
	
	app.get('/api/shows/latest', function(req,res){
		shows.latest(req.user, function(error,json){
			res.send(json);
		})
	}).get('/api/shows/random', function(req,res){
		shows.random(req.user, function(error,json){
			res.send(json);
		});
	}).get('/api/shows/unmatched', function(req,res){
		shows.unmatched(function(error,results){
			if (error) logger.error(error)
			res.send(results);
		});
	}).get('/api/shows/upcoming', function(req,res){
		shows.upcoming(req.user).then(function(calendar){
			res.send(calendar);
		});
	})
	
	app.post('/api/shows/listings', function(req,res){
		shows.listings(req.user);
		res.status(202).end();
	}).post('/api/shows/match', function(req,res){
		shows.match(req.user, req.body, function(error, result){
			if (error) logger.error(error);
			if (result) return res.status(201).end();
			res.status(400).end();
		});
	}).post('/api/shows/scan', function(req,res){
		shows.scan(req.user);
		res.status(202).end();
	}).post('/api/shows/search', function(req,res){
		shows.search(req.user, req.body.q, function(error,results){
			if (error) logger.error(error);
			res.send(results);
		});
	}).post('/api/shows/sync', function(req,res){
		shows.sync(req.user);
		res.status(202).end();
	})
	
	app.get('/api/shows/:imdb(tt[0-9]+)', function(req,res){
		shows.summary(req.user, req.params.imdb, function(error, show){
			if (error) logger.error(error);
			if (show) return res.send(show);
			res.status(404).end();
		});
	}).post('/api/shows/:imdb(tt[0-9]+)', function(req,res){
		shows.settings(req.user,req.body,function(error,status){
			if (error) logger.error(error);
			if (status) return res.status(200).end();
			res.status(400).end();
		});
	}).delete('/api/shows/:imdb(tt[0-9]+)', function(req,res){
		shows.remove(req.user, req.params.imdb, function(error,status){
			if (error) logger.error(error);
			if (status) return res.status(204).end();
			res.status(400).end();
		});
	})
	
	app.get('/api/shows/:imdb(tt[0-9]+)/progress', function(req,res){
		// Get show details
		shows.progress(req.user, req.params.imdb, function(error, json){
			if (error) logger.error(error);
			if (json) return res.send(json);
			res.status(404).end()
		});
	})
	
	app.post('/api/shows/:imdb(tt[0-9]+)/download', function(req,res){
		shows.download(req.params.imdb, req.body);
		res.status(202).end()
	}).post('/api/shows/:imdb(tt[0-9]+)/scan', function(req,res){
		// Scan episode files
		shows.scanEpisodes(req.user, req.params.imdb);
		res.status(202).end();
		
	}).post('/api/shows/:imdb(tt[0-9]+)/update', function(req,res){
		// Update show listings
		shows.getSummary(req.params.imdb).then(function(imdb){
			shows.getArtwork(imdb);
			shows.getFeed(imdb);
			shows.getListings(imdb).then(function(imdb){
	//			shows.getHashes(imdb);
			});
			shows.getProgress(req.user, imdb);
		}, function(error){
			logger.error(error);
		});
		res.status(202).end();
	}).post('/api/shows/:imdb(tt[0-9]+)/watched', function(req,res){
		shows.watched(req.user, req.params.imdb, req.body);
		res.status(202).end();
	})
}