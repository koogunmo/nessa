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
		movies.add(req.user, req.body.tmdb, function(error, result){
			socket.emit('alert', {'title':'Movie added','message':result.title});
		});
		return res.status(202).send({status:true,message:'Movie added'});
	});
	
	app.get('/api/movies/latest', function(req,res){
		movies.latest(req.user, function(error,movies){
			if (error) logger.error(error);
			if (movies){
				res.send(movies);
			} else {
				res.status(404).end();
			}
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
	})
	
	app.post('/api/movies/scan', function(req,res){
		socket.emit('alert', {'title':'Movies','message':'Scanning library...'});
		movies.scan(req.user, function(error,results){
			if (error) logger.error(error);
			logger.debug(results);
			socket.emit('alert', {'title':'Movies','message':'Scan complete'});
		});
		res.status(202).send({status:true,message:'Scanning movie library'});
		
	}).post('/api/movies/sync', function(req,res){
		socket.emit('alert', {title:'Movies', message:'Syncing library...'});
		movies.sync(req.user, function(error,results){
			if (error) logger.error(error);
			if (results.library){
				var message = 'Library: '+results.count+' movies synced';
			} else if (results.watchlist){
				var message = 'Watchlist: '+results.count+' movies synced';
			}
			if (message) socket.emit('alert', {'title':'Movies','message':message});
		});
		res.status(202).send({status:true,message:'Syncing movie library'});
		
	}).post('/api/movies/genres', function(req,res){
		socket.emit('alert', {title:'Movies', message:'Rebuilding genres...'});
		movies.rebuildGenres(function(){
			socket.emit('alert', {'title':'Movies','message':'Genres rebuilt'});
		});
		res.status(202).send({status:true,message:'Rebuilding genres'});
		
	})
	
	app.post('/api/:session?/movies/:id/download', function(req,res){
		// Download torrent
		movies.download(req.user, req.params.id, req.body, function(error,movie){
			var message = movie.title+' ('+movie.year+')';
			socket.emit('alert', {'title':'Download added','icon':'/media/'+nconf.get('media:movies:directory')+'/.artwork/'+movie.tmdb+'.jpg','message':message});
		})
		res.status(201).send({status:true,message:'Download added'});
	})
	
	
	app.get('/api/:session?/movies/:id', function(req,res){
		movies.get(req.user, req.params.id, function(error, result){
			if (error) return res.status(404).send(error);
			res.send(result);
		});
	})
	
	
	app.get('/api/:session?/movies/:id/hashes', function(req,res){
		movies.getHashes(req.params.id, function(error, hashes){
			if (error) logger.error(error);
			res.send(hashes);
		});
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
	
	
	/* Library Maintenance */
	
	app.post('/api/movies/rebuild/genres', function(req,res){
		movies.rebuildGenres();
		socket.emit('alert', {title: 'Movies', message: 'Rebuilding genres...'});
		res.status(202).end();
		
	}).post('/api/movies/rebuild/library', function(req,res){
		socket.emit('alert', {title: 'Movies', message: 'Rebuilding library...'});
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
		res.status(202).end();
	});
}