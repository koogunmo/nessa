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
	var movies	= require('nodetv-movies');
	
	app.get('/api/movies', function(req,res){
		// Get show list
		movies.list(req.user, function(error,results){
			if (error) {
				logger.error(error);
				return res.status(404).send({status:false,message:error});
			}
			if (results) return res.send(results);
		});
	}).post('/api/movies', function(req,res){
		// Add movie to database
		movies.add(req.user, req.body.imdb, function(error, result){
			socket.emit('alert', {'title':'Movie added','message':result.title});
		});
		return res.status(202).send({status:true,message:'Movie added'});
	});
	
	app.get('/api/movies/latest', function(req,res){
		movies.latest(req.user).then(function(movies){
			res.send(movies);
		}, function(error){
			logger.error(error);
			res.status(404).end();
		});
	}).get('/api/movies/pending', function(req,res){
		movies.pending(req.user, function(error,movies){
			if (error) logger.error(error);
			if (movies){
				res.send(movies);
			} else {
				res.status(404).end();
			}
		});
	}).get('/api/movies/unmatched', function(req,res){
		movies.getUnmatched(function(error,results){
			if (error) logger.error(error);
			if (results) {
				res.send(results);
			} else {
				res.status(404).end();
			}
		})
	})
	
	app.post('/api/movies/genres', function(req,res){
		socket.emit('alert', {'title':'Movies','message':'Rebuilding genres...'});
		movies.rebuildGenres(function(){
			socket.emit('alert', {'title':'Movies','message':'Genres rebuilt'});
		});
		res.status(202).send({'status':true,'message':'Rebuilding genres'});
		
	}).post('/api/movies/match', function(req,res){
		// Save manual matches
		movies.match(req.user, req.body);
		return res.status(202).end();
		
	}).post('/api/movies/scan', function(req,res){
		socket.emit('alert', {'title':'Movies','message':'Scanning library...'});
		movies.scan(req.user, function(error, imdb){
			if (error) logger.error(error);
		});
		res.status(202).send({'status':true,'message':'Scanning movie library'});
		
	}).post('/api/movies/search', function(req,res){
		movies.search(req.user, req.body.q, function(error, results){
			if (error) return logger.error(error);
			res.send(results);
		});
	}).post('/api/movies/sync', function(req,res){
		socket.emit('alert', {'title':'Movies','message':'Syncing library...'});
		movies.sync(req.user, function(error,results){
			if (error) logger.error(error);
			if (results.library){
				var message = 'Library: '+results.count+' movies synced';
			} else if (results.watchlist){
				var message = 'Watchlist: '+results.count+' movies synced';
			}
			if (message) socket.emit('alert', {'title':'Movies','message':message});
		});
		res.status(202).send({'status':true,'message':'Syncing movie library'});
	})
	
	app.get('/api/movies/:imdb(tt[0-9]+)', function(req,res){
		movies.get(req.user, req.params.imdb).then(function(result){
			res.send(result);
		}, function(error){
			logger.error(error)
			res.status(404).end();
		});
	})
	
	app.post('/api/movies/:imdb([0-9]+)/download', function(req,res){
		// Download torrent
		movies.download(req.user, req.params.imdb, req.body, function(error,movie){
			var message = movie.title+' ('+movie.year+')';
			socket.emit('alert', {'title':'Download added','icon':'/media/'+nconf.get('media:movies:directory')+'/.artwork/'+movie.imdb+'.jpg','message':message});
		})
		res.status(201).send({status:true,message:'Download added'});
		
	}).post('/api/movies/:imdb([0-9]+)/hashes', function(req,res){
		movies.getHashes(req.params.imdb, function(error, hashes){
			if (error) logger.error(error);
			res.send(hashes);
		});
	})
}