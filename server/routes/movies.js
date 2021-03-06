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
		movies.list(req.user).then(function(results){
			return res.send(results);
		}, function(error){
			res.status(404).end()
		});
	}).post('/api/movies', function(req,res){
		// Add movie to database
		movies.add(req.user, req.body.imdb).then(function(movie){
			res.status(202).send(movie);
		}, function(error){
			res.status(400).end()
		});
	});
	
	app.get('/api/movies/latest', function(req,res){
		movies.latest(req.user).then(function(movies){
			res.send(movies);
		}, function(error){
			logger.error(error);
			res.status(404).end();
		});
	}).get('/api/movies/pending', function(req,res){
		movies.pending(req.user).then(function(movies){
			res.send(movies);
		},function(error){
			res.status(404).end();
		});
	}).get('/api/movies/unmatched', function(req,res){
		movies.getUnmatched().then(function(movies){
			res.send(movies);
		}, function(error){
			res.status(404).end();
		});
	});
	
	
	app.post('/api/movies/genres', function(req,res){
		socket.emit('alert', {'title':'Movies','message':'Rebuilding genres','type':'info'});
		movies.rebuildGenres().then(function(){
			socket.emit('alert', {'title':'Movies','message':'Genres rebuilt','type':'success'});
		});
		res.status(202).end();
		
	}).post('/api/movies/match', function(req,res){
		// Save manual matches
		movies.match(req.user, req.body);
		return res.status(202).end();
		
	}).post('/api/movies/scan', function(req,res){
		socket.emit('alert', {'type':'info','title':'Scanning library','message':'Movies'});
		movies.scan(req.user);
		res.status(202).end();
		
	}).post('/api/movies/search', function(req,res){
		movies.search(req.user, req.body.q).then(function(movies){
			res.send(movies);
		}, function(error){
			res.status(404).end();
		});
	}).post('/api/movies/sync', function(req,res){
		movies.sync(req.user);
		res.status(202).end();
	})
	
	app.get('/api/movies/:imdb(tt[0-9]+)', function(req,res){
		movies.get(req.user, req.params.imdb).then(function(result){
			res.send(result);
		}, function(error){
			res.status(404).end();
		});
	}).post('/api/movies/:imdb(tt[0-9]+)', function(req,res){
		// Rescan & rebuild
		movies.unlink(req.params.imdb).then(function(movie){
			movies.link(movie.imdb);
		});
		res.status(202).end();
		
	}).delete('/api/movies/:imdb(tt[0-9]+)', function(req,res){
		movies.remove(req.user, req.params.imdb).then(function(movie){
			res.status(204).send(movie);
		});
	});
	
	app.get('/api/movies/:imdb(tt[0-9]+)/hashes', function(req,res){
		movies.getHashes(req.params.imdb).then(function(hashes){
			res.send(hashes);
		}, function(error){
			res.status(404).end()
		});
	}).get('/api/movies/:imdb(tt[0-9]+)/artwork', function(req,res){
		// Download torrent
		movies.getArtwork(req.params.imdb, req.body);
		res.status(201).end();
	
	})
	app.post('/api/movies/:imdb(tt[0-9]+)/download', function(req,res){
		// Download torrent
		movies.download(req.user, req.params.imdb, req.body).then(function(movie){
			socket.emit('alert',{
				'type':'info',
				'title':'Movie downloading',
				'message':movie.title+' ('+movie.year+')',
				'icon':'/media/'+nconf.get('media:movies:directory')+'/.artwork/'+movie.imdb+'/poster.jpg',
			});
		})
		res.status(201).end();
		
	})
}