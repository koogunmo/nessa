var fs			= require('fs'),
	http		= require('http'),
	log4js		= require('log4js'),
	mkdirp		= require('mkdirp'),
	ObjectID	= require('mongodb').ObjectID,
	path		= require('path'),
	Q			= require('q'),
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
		var self = this, deferred = Q.defer();
		var process = function(error,json){
			if (error) logger.debug('movie.add:', error);
			if (json){
				try {
					var record = {
						'title': json.title,
						'year': parseInt(json.year,10),
						'url': json.url.split('/').pop(),
						'synopsis': json.overview,
						'released': new Date(json.released*1000),
						'runtime': parseInt(json.runtime,10),
						'imdb': json.imdb_id,
						'tmdb': parseInt(json.tmdb_id,10),
						'genres': json.genres,
						'added': new Date(),
						'updated': new Date()
					};
					movieCollection.update({'tmdb':record.tmdb},{$set:record},{'upsert':true}, function(error, affected, status){
						if (error) logger.error(error);
						if (affected){
							self.getArtwork(record.tmdb);
							self.getHashes(record.tmdb);
							self.addUser(user, record.tmdb);
							trakt(user.trakt).movie.watchlist(record.imdb);
							deferred.resolve(record);
						}
						if (error) deferred.reject(error);
						if (typeof(callback) == 'function') callback(error, record);
					});
				} catch(e){
					logger.error('movie.add:', e.message);
				}
			}
		};
		if (typeof(tmdb) == 'array'){
			trakt(user.trakt).movie.summaries(tmdb,function(error,results){
				results.forEach(function(result){
					process(error,result)
				});
			});
		} else {
			trakt(user.trakt).movie.summary(parseInt(tmdb,10),process);
		}
		return deferred.promise;
	},
	complete: function(data, callback){
		try {
			var self = this, hash = data.hash.toUpperCase(), deferred = Q.defer();
			// Called when download is complete in Transmission
			movieCollection.findOne({$or:[{'hashes.hash':hash},{'hash':hash}]},function(error,movie){
				if (error) logger.error(error);
				if (movie){
					var exts = ['.avi','.mkv','.mp4'], size = 0;
					
					var files = data.files.filter(function(file){
						if (exts.indexOf(path.extname(file.name)) == -1) return false;
						return true;
					});
					if (files.length != 1) return;
					
					var record = self.getFilename(movie, files[0].name);
					record.quality = movie.downloading;
					record.size = files[0].bytesCompleted;
					record.added = new Date();
					record.updated = new Date();
					
					if (movie.file){
						if (movie.file == record.file && !movie.downloading) return false;
						if (movie.file != record.file) self.unlink(movie.tmdb);
					}
					var basedir = nconf.get('media:base')+nconf.get('media:movies:directory');
					var source = data.dir+'/'+files[0].name, target = basedir+'/A-Z/'+record.file;
					
					helper.fileCopy(source, target, function(error){
						if (error) {
							logger.error(error);
							deferred.reject(error);
							return;
						}
						movieCollection.update({'tmdb':movie.tmdb},{$set:record,$unset:{'downloading':true}},function(error, affected){
							if (error) {
								logger.error(error);
								deferred.reject(error);
							} else {
								self.link(movie.tmdb)
								deferred.resolve(movie.tmdb);
							}
						});
						if (movie.users){
							movie.users.forEach(function(u){
								userCollection.findOne({'_id':ObjectID(u._id),'trakt':{$exists:true}},{'trakt':1},function(error,user){
									if (error) logger.error(error);
									if (user.trakt) trakt(user.trakt).movie.library(movie.imdb);
								});
							});
						}
						if (typeof(callback) == 'function') callback(error, {'movie':movie,'trash':nconf.get('media:movies:autoclean')})
					});
				}
			});
			return deferred.promise;
		} catch(e){
			logger.error('movie.complete:', e.message)
		}
	},
	download: function(user, tmdb, data, callback){
		var self = this, tmdb = parseInt(tmdb, 10), deferred = Q.defer();
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) logger.error(error);
			if (movie){
				torrent.add(data.magnet, function(error, args){
					if (error) {
						logger.error(error);
						deferred.reject(error);
					}
					if (args.hashString){
						movieCollection.update({'tmdb':tmdb},{$set:{'downloading':data.quality,'hash':args.hashString.toUpperCase()}}, {w:0});
						deferred.resolve(movie.tmdb);
					}
					if (typeof(callback) == 'function') callback(error, movie);
				});
			}
		});
		return deferred.promise;
	},
	get: function(user, tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({'tmdb':tmdb}, callback);
	},
	latest: function(user, callback){
		// List the most recently added movies
		movieCollection.find({'file':{$exists:true}}).sort({'added':-1}).limit(20).toArray(callback);
	},
	link: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10), deferred = Q.defer();
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) {
				logger.error(error);
				deferred.reject(error);
				return;
			}
			var basedir = nconf.get('media:base')+nconf.get('media:movies:directory');
			movie.genres.forEach(function(genre){
				var folder = basedir +'/Genres/'+genre, symlink = path.basename(movie.file);
				if (!fs.existsSync(folder)) mkdirp.sync(folder, 0775);
				if (!symlink || fs.existsSync(folder+'/'+symlink)) return;
				fs.symlink(basedir+'/A-Z/'+movie.file, folder+'/'+symlink, 'file', function(error){
					if (error) logger.error(error);
				});
			});
			deferred.resolve(movie.genres);
			if (typeof(callback) == 'function') callback(movie.genres);
		});
		return deferred.promise;
	},
	list: function(user, callback){
		// List all movies (TODO: by user)
		movieCollection.find({'tmdb':{$exists: true}}).sort({'name':1}).toArray(callback);
	},
	pending: function(user, callback){
		// Movies awaiting human intervention
		movieCollection.find({'file':{$exists:false},'hashes':{$exists:true}}).sort({'updated':-1}).toArray(callback);
	},
	remove: function(user, tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		/*
		if (physical){
			self.unlink(tmdb, function(error){
				movieCollection.remove({'tmdb':tmdb}, {w:0});
				if (typeof(callback) == 'function') callback(error, true);
			});
		} else {
			
		}
		*/
	//	movieCollection.update({'tmdb':tmdb}, {$set: {status: false}}, {upsert: true, w:0});
		// Remove from library
	},
	rename: function(user, tmdb, file, quality, callback){
		var self = this, tmdb = parseInt(tmdb,10), deferred = Q.defer();
		var basedir = nconf.get('media:base') + nconf.get('media:movies:directory');
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) {
				logger.error(error);
				deferred.reject(error);
			}
			if (movie){
				var record = self.getFilename(movie,file),
					target = basedir+'/A-Z/'+record.file;
				
				if (target != file){
					// Let's not move files that are already in the right place
					if (fs.existsSync(path.dirname(target))) mkdirp.sync(path.dirname(target));
					helper.fileMove(file, target, function(error){
						if (error) return logger.error(error);
						movieCollection.update({'tmdb':tmdb}, {$set: record}, function(error, affected){
							if (error) logger.error(error);
							if (affected) self.link(movie.tmdb);
						});
						trakt(user.trakt).movie.library(movie.imdb);
						deferred.resolve(movie.imdb);
					});
				}
			}
			if (typeof(callback) == 'function') callback(error);
		});
		return deferred.promise;
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
		helper.listDirectory(base, function(error, file){
			if (error) logger.error(error);
			
			if (file.stat.isSymbolicLink()) return;
			
			var ext = path.extname(file.path), name = path.basename(file.path, ext),
				offset = 0, quality = '480p', title = '', year = 0;
			
			if (name.match(/^(.+)\s?(\([\d]{4}\)|\[[\d]{4}\])/i)){
				var matched = name.match(/^(.+)\s?(\([\d]{4}\)|\[[\d]{4}\])/i);
				title = matched[1].trim(), year = parseInt(matched[2].replace(/\D/, ''));
			} else {
				// Guesswork time...
				name = name.replace(/\W/g, ' ');
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
			
			var stats = {
				added: file.stat.mtime,
				size: parseInt(file.stat.size,10)
			};
			
			if (title.match(', The')) title = 'The '+title.replace(', The', '');
			trakt(user.trakt).search('movies', title, function(error, results){
				if (error) return logger.error(error);
				var resolved = false, unmatched = [];
				
				if (results.length == 1){
					logger.debug('Adding: '+results[0].title);
					self.add(user, parseInt(results[0].tmdb_id,10), function(error, movie){
						if (error) logger.error(error);
						if (movie){
							trakt(user.trakt).movie.library(movie.tmdb);
							
							self.rename(user, movie.tmdb, file.path, quality);
							movieCollection.update({'tmdb': movie.tmdb}, {$set: stats}, {w:0});
							
							if (typeof(callback) == 'function') callback(null, movie.tmdb);
						}
					});
				} else {
					var filtered = results.filter(function(result){
						var include = true;
						if (year && result.year != year || !result.year) include = false;
						if (title) {
							title.split(' ').forEach(function(word){
								if (result.title.toLowerCase().indexOf(word.toLowerCase()) == -1) include = false;
							});
						}
						return include;
					});
					
					if (filtered.length == 1){
						// Exact match!
						logger.debug('Adding: '+filtered[0].title);
						self.add(user, parseInt(filtered[0].tmdb_id,10), function(error, movie){
							if (error) logger.error(error);
							if (movie){
								trakt(user.trakt).movie.library(movie.tmdb);
								
								self.rename(user, movie.tmdb, file.path, quality);
								movieCollection.update({'tmdb': movie.tmdb}, {$set: stats}, {w:0});
								
								if (typeof(callback) == 'function') callback(null, movie.tmdb);
							}
						});
						return;
					} else {
						unmatched = (filtered.length) ? filtered : results;
					}
					if (unmatched.length){
						movieCollection.findOne({title:title}, function(error,movie){
							if (error) logger.error(error);
							if (movie){
								self.rename(user, movie.tmdb, file.path, quality, function(error){
									trakt(user.trakt).movie.library(movie.tmdb);
									
									if (error) logger.error(error);
									if (!error) movieCollection.update({tmdb: movie.tmdb}, {$set: {size: stats.size}}, {w:0});
									
									if (typeof(callback) == 'function') callback(error, movie.tmdb);
								});
							} else {
								logger.debug('Unmatched: %s (%d)', title, unmatched.length);
								var record = {
									'type': 'movie',
									'file': file.path,
									'size': stats.size,
									'unmatched': unmatched
								};
								unmatchedCollection.update({file: file.path}, record, {upsert:true, w:0});
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
			trakt(user.trakt).user.library.movies.all(function(error, movies){
				logger.debug('Syncing movie library...');
				if (error) logger.error(error);
				if (movies){
					logger.debug('Movie Library: ', movies.length);
					movies.forEach(function(movie){
						var record = {
							'title': movie.title,
							'year': parseInt(movie.year,10),
							'url': movie.url.split('/').pop(),
							'synopsis': movie.overview,
							'released': new Date(movie.released*1000),
							'runtime': parseInt(movie.runtime,10),
							'imdb': movie.imdb_id,
							'tmdb': parseInt(movie.tmdb_id,10),
							'genres': movie.genres,
							'updated': new Date()
						};
						movieCollection.update({'tmdb':record.tmdb},{$set:record},{'upsert':true}, function(error,affected,status){
							if (error) return logger.error(error);
							if (affected){
								self.addUser(user, movie.tmdb);
								self.getArtwork(movie.tmdb);
							}
						});
					});
				}
				if (typeof(callback) == 'function') callback(error, {'library':true,'count':movies.length});
			});
			
			trakt(user.trakt).user.watchlist.movies(function(error, movies){
				logger.debug('Syncing watchlist...');
				if (error) logger.error(error);
				if (movies){
					logger.debug('Movie Watchlist: ', movies.length);
					movies.forEach(function(movie){
						var record = {
							'title': movie.title,
							'year': parseInt(movie.year,10),
							'url': movie.url.split('/').pop(),
							'synopsis': movie.overview,
							'released': new Date(movie.released*1000),
							'runtime': movie.runtime,
							'imdb': movie.imdb_id,
							'tmdb': parseInt(movie.tmdb_id,10),
							'genres': movie.genres,
							'watchlist': true,
							'updated': new Date()
						};
						movieCollection.update({'tmdb':record.tmdb},{$set:record},{'upsert':true}, function(error,affected){
							self.getArtwork(record.tmdb);
						});
					});
				}
				if (typeof(callback) == 'function') callback(error, {'watchlist':true,'count':movies.length});
			});
		} catch(e){
			logger.error('Movie sync: ', e.message);
		}
	},
	
	unlink: function(tmdb,callback){
		var self = this, tmdb = parseInt(tmdb,10);
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) logger.error(error);
			if (movie){
				var basedir = nconf.get('media:base')+nconf.get('media:movies:directory');
				if (movie.file && movie.genres){
					var filename = path.basename(movie.file);
					movie.genres.forEach(function(genre){
						fs.unlink(basedir+'/Genres/'+genre+'/'+filename, function(error){
							if (error) return logger.error(error);
							logger.debug('Removed: %s/%s', genre, filename)
						});
					});
			//		fs.unlink(basedir+'/A-Z/'+movie.file, function(error){
			//			if (error) return logger.error(error);
			//			logger.debug('Removed: A-Z/%s', movie.file);
			//		});
				}
			}
			if (typeof(callback) == 'function') callback(error);
		})
	},
	
	match: function(user, matches, callback){
		var self = this, deferred = Q.defer();
		
		matches.forEach(function(match){
			var tmdb = parseInt(match.tmdb,10);
			movieCollection.update({'tmdb':tmdb},{'file':match.file},{'upsert':true})
			
			self.add(match.tmdb, function(error,result){
				
			});
			
		});
	},
	
	/*
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
	*/
	
	/*****  *****/
	
	addUser: function(user,tmdb){
		// Add user to movie
		var self = this, tmdb = parseInt(tmdb,10), deferred = Q.defer();
		var addUser = function(record){
			movieCollection.update({'tmdb':tvdb},record,function(error,affected){
				if (error) logger.error(error);
			});
		};
		movieCollection.findOne({'tmdb':tmdb},function(error,movie){
			if (error) logger.error(error);
			if (movie){
				var record = {
					'_id': ObjectID(user._id),
					'username': user.username
				};
				if (movie.users){
					var users = movie.users.filter(function(u){
						if (ObjectID(user._id).equals(u._id)) return true;
						return false;
					});
					if (!users.length) {
						addUser({$addToSet:record});
					}
				} else {
					addUser({$set:{'users':[record]}})
				}
				
			}
			if (error) deferred.reject(error);
		});
		return deferred.promise();
	},
	
	clearSymlinks: function(callback){
		var self = this;
		var directory = nconf.get('media:base')+nconf.get('media:movies:directory')+'/Genres';
		
		helper.listDirectory(directory, function(error, file){
			if (error) logger.error(error);
			if (file.stat){
				if (file.stat.isSymbolicLink()){
					logger.debug('Unlink: ', file.path);
					fs.unlink(file.path);
				}
			}
		});
		if (typeof(callback) == 'function') callback();
	},
	
	rebuildGenres: function(callback){
		var self = this;
		movieCollection.find({file:{$exists:true},genres:{$exists:true}},{tmdb:1}).toArray(function(error,movies){
			if (error) return logger.error(error);
			// Delete all existing symlinks
			self.clearSymlinks(function(){
				setTimeout(function(){
					if (movies.length){
						movies.forEach(function(movie){
							self.link(movie.tmdb);
						});
					}
					if (typeof(callback) == 'function') callback();
				}, 10000);
			});
		});
	},
	
	getAlpha: function(name){
		var title = name.replace(/^The\s/, '').trim(),
			alpha = title.substr(0,1).toUpperCase();
		
		if (alpha.match(/\d/)) alpha = '#';
		return alpha; 
	},
	getArtwork: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) logger.error(error);
			if (movie){
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
			}
		});
	},
	getFilename: function(movie, file){
		var self = this;
		var alpha = self.getAlpha(movie.title), blocks = [], ext = path.extname(file), quality = self.getQuality(file), record = {status: true};
		blocks.push(movie.title.replace(/[\\\/\[\]]/ig, ''));
		blocks.push('('+movie.year+')');
		if (movie.downloading || movie.quality || quality) {
			record.quality = movie.downloading || movie.quality || quality;
			blocks.push('['+record.quality+']')
		}
		record.file = alpha+'/'+blocks.join(' ')+ext;
		return record;
	},
	getHashes: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({'tmdb':tmdb}, function(error, movie){
			if (error) {
				if (typeof(callback) == 'function') callback(error);
				return logger.error(error);
			}
			if (movie){
				var req = {
					'url': 'https://yts.wf/api/listimdb.json',
					'method': 'GET',
					'json': true,
					'qs': {'imdb_id': movie.imdb}
				};
				if (nconf.get('system:proxy')) {
					req.tunnel = true;
					req.proxy = nconf.get('system:proxy');
				}
				request(req, function(error, res, json){
					if (error) {
						logger.error(error)
						if (typeof(callback) == 'function') return callback(error, null);
						return;
					}
					if (json){
						var torrents = [];
						try {
							if (typeof(json) != 'object') json = JSON.parse(json);
							if (json.status == 'fail'){
								if (typeof(callback) == 'function') callback(json.error, torrents);
							} else if (json.MovieCount){
								json.MovieList.forEach(function(result){
									var object = {
										hash: result.TorrentHash.toUpperCase(),
										magnet: result.TorrentMagnetUrl,
										quality: result.Quality,
										size: parseInt(result.SizeByte,10)
									};
									torrents.push(object);
								});
								if (torrents.length) {
									var update = {
										hashes: torrents,
										updated: new Date()
									};
									movieCollection.update({_id: ObjectID(movie._id)},{$set:update},{w:0});
								}
								
							}
							if (typeof(callback) == 'function') callback(json.error, torrents);
						} catch(e){
							logger.error('YTS: ', e.message);
						}
					}
				})
			}
		});
	},
	getLatest: function(){
		try {
			var req = {
				'url': 'https://yts.wf/api/list.json',
				'method': 'GET',
				'json': true,
				'qs': {'limit': 25}
			};
			if (nconf.get('system:proxy')) {
				req.tunnel = true;
				req.proxy = nconf.get('system:proxy');
			}
			request(req, function(error,res,json){
				if (error) return logger.error(error);
				try {
					if (typeof(json) != 'object') json = JSON.parse(json);
					if (json.MovieCount){
						json.MovieList.forEach(function(result){
							var object = {
								hash: result.TorrentHash.toUpperCase(),
								magnet: result.TorrentMagnetUrl,
								quality: result.Quality,
								size: parseInt(result.SizeByte,10)
							};
							movieCollection.update({'imdb':result.ImdbCode},{$set:{'updated': new Date()},$addToSet:{'hashes':object}}, {w:0});
						});
					}
				} catch(e){
					logger.error(e.message);
				}
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	getQuality: function(file){
		var quality = '480p';
		if (file.match(/(1080p|720p|480p)/i)) quality = file.match(/(1080p|720p|480p)/i)[1];
		return quality;
	},
	getUnhashed: function(){
		var self = this;
		movieCollection.find({hashes: {$exists: false}},{tmdb:1}).toArray(function(error, movies){
			if (error) logger.error('getUnhashed:', error);
			if (movies){
				movies.forEach(function(movie){
					self.getHashes(movie.tmdb);
				});
			}
		})
	},
	getUnmatched: function(callback){
		unmatchedCollection.find({type: 'movie'}).sort({title:1}).limit(20).toArray(callback);
	},
	
	cleanHashes: function(){
		var self = this;
		movieCollection.find({hashes:{$exists:true}},{tmdb:1}).toArray(function(error,movies){
			if (error) logger.error(error);
			if (movies){
				logger.debug('Updating movie hashes')
				movies.forEach(function(movie){
					self.getHashes(movie.tmdb)
				});
			}
		})
	}
	
	
};
exports = module.exports = MovieData;