var fs			= require('fs'),
	http		= require('http'),
	log4js		= require('log4js'),
	ObjectID	= require('mongodb').ObjectID,
	request		= require('request'),
	trakt		= require('nodetv-trakt');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-moviedata');


var movieCollection = db.collection('movie'),
	userCollection = db.collection('user');

var MovieData = {
	add: function(user, tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		trakt(user.trakt).movie.summary(tmdb, function(error, json){
			var record = {
				title: json.title,
				synopsis: json.overview,
				year: json.year,
				imdb: json.imdb_id,
				tmdb: json.tmdb_id,
				genres: json.genres
			};
			movieCollection.update({tmdb: record.tmdb}, {$set: record}, {upsert:true}, function(error, affected, status){
				if (typeof(callback) == 'function') callback(error, record);
				self.getArtwork(record.tmdb);
			})
		});
	},
	download: function(user, tmdb, data, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb:tmdb}, function(error, movie){
			
		});
	},
	get: function(user, tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, callback);
	},
	link: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, function(error, result){
			if (error) return logger.error(error);
			
			var basedir = nconf.get('media:base') + nconf.get('media:movies:directory'),
				folder	= result.file.substring(0,1).toUpperCase();
			
			if (folder.match(/[1-9]/)) folder = '#';
			var source	= basedir +'/A-Z/'+folder+'/';
			
			result.genres.forEach(function(genre){
				var path = basedir +'/Genres/'+genre+'/';
				fs.symlink(source+result.file, path+result.file, 'file', function(error){
					if (error) logger.error(error);
				});
			});
		});
	},
	list: function(callback){
		movieCollection.find({tmdb: {$exists: true}}).toArray(callback);
	},	
	
	rename: function(){
		// rename & move the file
		/*
		var title = record.title.split(':', 2)
		
		logger.debug(title);
		
		
		var elements = [record.title,'('+record.year+')'];
		if (record.quality) elements.push('['+record.quality+']');
		
		var filename = elements.join(' ')+ext;
		var folder = record.title.substring(0,1).toUpperCase();
		
		var target = folder+'/'+filename;
		
		logger.debug(record, target)
		*/
	},
	
	
	
	remove: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.update({tmdb: tmdb}, {$set: {status: false}}, {upsert: true}, callback);
	},
		
	search: function(user, query, callback){
		if (!user.trakt) return;
		try {
			trakt(user.trakt).search('movies', query, callback);
		} catch(e){
			logger.error(e.message);
		}
	},
	
	sync: function(user, callback){
		// Retrive movie list from trakt
	},
	
	unmatched: function(callback){
		if (!callback) return;
	//	movieCollection.update({tmdb:{$exists:true},unmatched:{$exists:true}}, {$unset:{unmatched:true}}, {multi:true}, function(){
			movieCollection.find({tmdb: {$exists: false}, unmatched: {$exists: true}}).sort({title:1}).limit(50).toArray(callback);
	//	});
	},
	match: function(matched, callback){
		var self = this;
		try {
			for (var id in matched){
				movieCollection.findOne({'_id': ObjectID(id)}, function(error, movie){
					if (movie){
						var match = matched[movie._id];
						var record = {
							$set: {
								tmdb: parseInt(match.tmdb_id,10),
								imdb: match.imdb_id,
								year: parseInt(match.year,10),
								title: match.title,
								synopsis: match.overview,
								genres: match.genres							
							},
							$unset: {unmatched: true}
						};
						movieCollection.update({_id: ObjectID(movie._id)}, record, function(error, result){
							if (error) return logger.error(error);
							self.getArtwork(record.tmdb);
						});
					}
				});
			}
			if (typeof(callback) == 'function') callback(null);
		} catch(e){
			logger.error(e.message);
		}
	},
	
	watched: function(){},
	
	
	/*****  *****/
	getArtwork: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error || !movie) return;
			userCollection.findOne({admin: true}, {trakt:1}, function(error, admin){
				if (error || !admin) return logger.error(error);
				trakt(admin.trakt).movie.summary(movie.tmdb, function(error, json){
					if (json.images.poster) {
						var src = json.images.poster.replace('.jpg', '-138.jpg');
						var poster = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:movies:directory') + '/.artwork/' + movie.tmdb + '.jpg', {flags: 'w', mode: 0644});
						poster.on('error', function(e){
							logger.error(e);
						});
						var request = http.get(src, function(response){
							response.pipe(poster);
						});
					}
					if (typeof(callback) == 'function') callback(null, movie.tmdb);
				});
			});
		});
	},
	getHashes: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error) {
				if (typeof(callback) == 'function') callback(error);
				return logger.error(error);
			}
			if (movie){
				request({
					'url': 'https://yts.re/api/list.json',
					'method': 'GET',
					'json': true,
					'proxy': 'http://proxy.silico.media:8888',
					'tunnel': true,
					'qs': {
						'keywords': movie.imdb
					}
				}, function(error, res, json){
					if (error) {
						if (typeof(callback) == 'function') callback(error);
						return logger.error(error);
					}
					if (typeof(json) != 'object') json = JSON.parse(json);
					
					var torrents = [];
					if (json.status == 'fail'){
						if (typeof(callback) == 'function') callback(json.error, torrents);
					} else if (json.MovieCount){
						json.MovieList.forEach(function(result){
							var object = {
								imdb: result.ImdbCode,
								hash: result.TorrentHash.toUpperCase(),
								magnet: result.TorrentMagnetUrl,
								quality: result.Quality,
								size: result.SizeByte,
								title: result.MovieTitleClean,
								year: result.MovieYear
							};
							torrents.push(object);
						});
						if (torrents.length) movieCollection.update({_id: ObjectID(movie._id)}, {$set: {hashes: torrents}}, {w:0});
						if (typeof(callback) == 'function') callback(null, torrents);
					}
				})
			}
		});
	},
	getUnmatched: function(callback){
		movieCollection.find({unmatched: {$exists: true}}).toArray(function(error, movies){
			if (typeof(callback) == 'function') callback(error, movies);
		});
	}	
};
exports = module.exports = MovieData;