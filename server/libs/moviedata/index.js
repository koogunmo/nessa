var fs			= require('fs'),
	http		= require('http'),
	log4js		= require('log4js'),
	mkdirp		= require('mkdirp'),
	ObjectID	= require('mongodb').ObjectID,
	path		= require('path'),
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
	unmatchedCollection = db.collection('unmatched'),
	userCollection = db.collection('user');

var MovieData = {
	add: function(user, tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		trakt(user.trakt).movie.summary(tmdb, function(error, json){
			var url = json.url.split('/');
			var record = {
				title: json.title,
				year: parseInt(json.year,10),
				url: url.pop(),
				synopsis: json.overview,
				runtime: parseInt(json.runtime,10),
				imdb: json.imdb_id,
				tmdb: parseInt(json.tmdb_id,10),
				genres: json.genres,
				watchlist: true
			};
			movieCollection.update({tmdb: record.tmdb}, {$set: record}, {upsert:true}, function(error, affected, status){
				if (typeof(callback) == 'function') callback(error, record);
				self.getArtwork(record.tmdb);
				// Add to Watchlist
			//	trakt(user.trakt).movie.watchlist.movie(record.imdb);
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
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error) return logger.error(error);
			var basedir = nconf.get('media:base')+nconf.get('media:movies:directory'),
				alpha	= self.getAlpha(movie.file);
			
			movie.genres.forEach(function(genre){
				var folder = basedir +'/Genres/'+genre, symlink = path.basename(movie.file);
				
				if (!fs.existsSync(folder)) mkdirp.sync(folder, 0775);
				fs.symlink(basedir+'/A-Z/'+movie.file, folder+'/'+symlink, 'file', function(error){
					if (error) logger.error(error);
				});
			});
			if (typeof(callback) == 'function') callback();
		});
	},
	list: function(callback){
		movieCollection.find({tmdb: {$exists: true}}).sort({name:1}).toArray(callback);
	},
	rename: function(tmdb, file, quality, callback){
		var self = this, tmdb = parseInt(tmdb,10);
		var basedir = nconf.get('media:base') + nconf.get('media:movies:directory');
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error) return logger.error(error);
			if (movie){
				var record = self.getFilename(movie,file);
				helper.fileMove(file, basedir+'/A-Z/'+record.file, function(error){
					if (error) return logger.error(error);
					movieCollection.update({tmdb: tmdb}, {$set: record}, {w:0});
					self.link(movie.tmdb);
				});
			}
		})
	},
	
	remove: function(tmdb, physical, callback){
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
	
	scan: function(user, callback){
		var self = this;
		logger.debug('Scanning movie library...');
		var base =  nconf.get('media:base') + nconf.get('media:movies:directory') + '/A-Z'
		helper.listDirectory(base, function(file){
			var ext = path.extname(file), name = path.basename(file, ext), offset = 0, quality = '480p', title = '', year = 0;
			
			if (name.match(/^(.+)\s?(\([\d]{4}\)|\[[\d]{4}\])/i)){
				var matched = name.match(/^(.+)\s?(\([\d]{4}\)|\[[\d]{4}\])/i);
				title = matched[1].trim(), year = parseInt(matched[2].replace(/\D/, ''));
			} else {
				// guesswork time...
				name = name.replace(/\./g, ' ');
				var numbers = name.match(/(\d{4})/g);
				if (numbers){
					numbers.forEach(function(number){
						if (parseInt(number,10) >= 1887){
							// If you're wondering 'Why 1887?': (http://www.imdb.com/title/tt2075247/)
							year = parseInt(number, 10);
							offset = name.indexOf(number);
						}
					});
					if (offset > 0) title = name.substring(0, offset).trim();
				} else {
					title = name.trim();
				}
			}
			quality = self.getQuality(name);
			
			if (title.match(', The')) title = 'The '+title.replace(', The', '');
			trakt(user.trakt).search('movies', title, function(error, results){
				if (error) return logger.error(error);
				if (results.length == 1){
					self.add(user, parseInt(results[0].tmdb_id,10), function(error, movie){
						self.rename(movie.tmdb, file, quality);
						if (typeof(callback) == 'function') callback(null, movie.tmdb);
					});
					return;
				} else {
					var unmatched = [];
					
					var filtered = results.filter(function(result){
						var include = true;
						if (year && result.year != year || !result.year) include = false;
						if (title) {
							title.split(' ').forEach(function(word){
								if (result.title.indexOf(word) == -1) include = false;
							});
						}
						return include;
					});
					
					if (filtered.length == 1){
						// Exact match!
						logger.debug('Adding: '+filtered[0].title);
						self.add(user, parseInt(filtered[0].tmdb_id,10), function(error, movie){
							self.rename(movie.tmdb, file, quality);
							if (typeof(callback) == 'function') callback(null, movie.tmdb);
						});
						return;
					} else {
						unmatched = (filtered.length) ? filtered : results;
					}
					
					if (unmatched.length){
						movieCollection.findOne({title:title}, function(error,movie){
							if (error) logger.error(error);
							if (movie){
								self.rename(movie.tmdb, file, quality);
								if (typeof(callback) == 'function') callback(null, movie.tmdb);
							} else {
								logger.debug('Unmatched: %s (%d)', title, unmatched.length);
								var record = {
									type: 'movie',
									file: file,
									unmatched: unmatched
								};
								unmatchedCollection.update({file: file}, record, {upsert:true, w:0});
							}
						});
					}
				}
			});
		});
	},
	
	sync: function(user, callback){
		// Retrive movie list from trakt
		var self = this;
		try {
			trakt(user.trakt).user.library.movies.all(function(error, results){
				logger.debug('Syncing library...');
				if (error) logger.error(error);
				if (results){
					logger.debug('Movie Library: '+results.length);
					results.forEach(function(result){
						var title = result.url.split('/');
						var record = {
							title: result.title,
							year: parseInt(result.year,10),
							url: title.pop(),
							synopsis: result.overview,
							runtime: parseInt(result.runtime,10),
							imdb: result.imdb_id,
							tmdb: parseInt(result.tmdb_id,10),
							genres: result.genres
						};
						movieCollection.update({tmdb: record.tmdb}, {$set: record}, {upsert:true}, function(error,affected,status){
							if (error) return logger.error(error);
							
						//	if (affected)
							
							logger.debug(affected, status)
						//	if (status.updatedExisting)
							if (affected) self.getArtwork(record.tmdb);
						});
					});
				}
			//	if (typeof(callback) == 'function') callback(null, results.length);
			});
			trakt(user.trakt).user.watchlist.movies(function(error, results){
				logger.debug('Syncing watchlist...');
				if (error) logger.error(error);
				if (results){
					logger.debug('Movie Watchlist: '+results.length);
					results.forEach(function(result){
						var title = result.url.split('/');
						var record = {
							title: result.title,
							year: parseInt(result.year,10),
							url: title.pop(),
							synopsis: result.overview,
							runtime: result.runtime,
							imdb: result.imdb_id,
							tmdb: parseInt(result.tmdb_id,10),
							genres: result.genres,
							watchlist: true
						};
						movieCollection.update({tmdb: record.tmdb}, {$set: record}, {upsert:true}, function(error,affected){
							self.getArtwork(record.tmdb);
						});
					});
				}
			})
			
		} catch(e){
			logger.error(e.message)
		}
	},
	
	unmatched: function(callback){
		if (!callback) return;
		unmatchedCollection.find({type: 'movie', tmdb: {$exists: false}, unmatched: {$exists: true}}).sort({title:1}).limit(50).toArray(callback);
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
	
	watched: function(user, tmdb){},
	
	
	/*****  *****/
	getAlpha: function(name){
		var title = name.replace(/^The\s/, '').trim(),
			alpha = title.substr(0,1).toUpperCase();
		
		if (alpha.match(/\d/)) alpha = '#';
		return alpha; 
	},
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
	getFilename: function(movie,file){
		var self = this;
		var alpha = self.getAlpha(movie.title), blocks = [], ext = path.extname(file), quality = self.getQuality(file), record = {status: true};
		blocks.push(movie.title);
		blocks.push('('+movie.year+')');
		if (movie.quality || quality) {
			record.quality = movie.quality || quality;
			blocks.push('['+record.quality+']')
		}
		record.file = alpha+'/'+blocks.join(' ')+ext;
		return record;
	},
	getHashes: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error) {
				if (typeof(callback) == 'function') callback(error);
				return logger.error(error);
			}
			if (movie){
				var req = {
					'url': 'https://yts.re/api/listimdb.json',
					'method': 'GET',
					'json': true,
					'tunnel': true,
					'qs': {'imdb_id': movie.imdb}
				};
				if (nconf.get('system:proxy')) req.proxy = nconf.get('system:proxy')
				request(req, function(error, res, json){
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
								hash: result.TorrentHash.toUpperCase(),
								magnet: result.TorrentMagnetUrl,
								quality: result.Quality,
								size: result.SizeByte
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
	getQuality: function(file){
		var quality = '480p';
		if (file.match(/(1080p|720p|480p)/i)) quality = file.match(/(1080p|720p|480p)/i)[1];
		return quality;
	},
	getUnmatched: function(callback){
		movieCollection.find({unmatched: {$exists: true}}).toArray(function(error, movies){
			if (typeof(callback) == 'function') callback(error, movies);
		});
	}	
};
exports = module.exports = MovieData;