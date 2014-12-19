var extend	= require('xtend'),
	fs		= require('fs'),
	http	= require('http'),
	log4js	= require('log4js'),
	mkdir	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	path	= require('path'),
	Q		= require('q'),
	request	= require('request'),
	trakt	= require('nodetv-trakt'),
	util	= require('util');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-showdata');


var ObjectID = require('mongodb').ObjectID;
var episodeCollection = db.collection('episode'),
	showCollection = db.collection('show'),
	unmatchedCollection = db.collection('unmatched'),
	userCollection = db.collection('user');


/*
episodeCollection.find({'airdate':{$exists:true}}).toArray(function(error,episodes){
	if (error) logger.error(error)
	if (episodes){
		episodes.forEach(function(episode){
			logger.debug(new Date(episode.airdate*1000));
		//	episodeCollection.update({'_id':ObjectID(episode._id)},{$set:{'airdate':new Date(episode.airdate*1000)}},{w:0});
		})
	}
})
*/

var ShowData = {
	
	/***** Rewritten methods *****/
	
	add: function(user, tvdb, callback){
		var self = this;
		var process = function(error,json){
			if (error) logger.error('show.add:',error);
			if (json){
				try {
					var record = {
						'name': json.title,
						'year': parseInt(json.year,10),
						'url': json.url.split('/').pop(),
						'synopsis': json.overview,
						'imdb': json.imdb_id,
						'tvdb': parseInt(json.tvdb_id,10),
						'genres': json.genres,
						'added': new Date(),
						'updated': new Date(),
						'ended': (json.status == 'Ended') ? true : false
					};
					showCollection.update({'tvdb':record.tvdb},{$set:record},{'upsert':true}, function(error,affected,status){
						if (error) logger.error(error);
						if (affected){
							showCollection.findOne({'tvdb':record.tvdb}, function(error,show){
								if (error) logger.error(error);
								if (show){
									if (!show.directory){
										// Create directory
										show.directory = helper.formatDirectory(show.name);
										var dir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + record.directory;
										mkdir.sync(dir, 0775);
									}
									showCollection.save(show, function(error,result){
										if (error) logger.error(error);
										if (result) {
											self.addUser(user, show.tvdb);
											self.getArtwork(show.tvdb);
											self.getFeed(show.tvdb);
										}
										if (typeof(callback) == 'function') callback(error, show.tvdb);
									});
								}
							});
						}
					});
				} catch(e){
					logger.error('show.add:',e.message);
				}
			}
		};
		if (typeof(tvdb) == 'array'){
			tvdb.forEach(function(id){
				trakt(user.trakt).show.summary(parseInt(id,10), process);
			});
		} else {
			trakt(user.trakt).show.summary(tvdb, process);
		}
	},
	complete: function(data, callback){
		try {
			var self = this, hash = data.hash.toUpperCase();
			episodeCollection.findOne({'downloading':{$exists:true},$or:[{'hashes.hash':hash},{'hash':hash}]}, function(error,episode){
				if (error) logger.error(error);
				if (episode){
					var exts = ['.avi','.mkv','.mp4'], file = null, library = [], size = 0;
					var files = data.files.filter(function(file){
						if (exts.indexOf(path.extname(file.name)) == -1) return false;
						return true;
					});
					if (files.length != 1) return;
					file = files[0];
					showCollection.findOne({'tvdb': episode.tvdb}, function(error,show){
						if (error) logger.error(error);
						if (show){
							var basedir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/';
							
							self.getFilename(file,show).then(function(filename){
								var record = {
									'file': filename,
									'size': files[0].bytesCompleted,
									'added': new Date(),
									'updated': new Date()
								};
								if (!record.file) return;
								var source = data.dir+'/'+file.name, target = basedir+record.file;
								
								helper.fileCopy(source, target, function(error){
									if (error) return logger.error(error);
									var search = {'tvdb:':show.tvdb,'season':numbers.season,'episode':{$in:numbers.episodes}};
									
									episodeCollection.update(search,{$set:record,$unset:{'downloading':true}},{'multi':true,'w':0});
									showCollection.update({'tvdb':show.tvdb},{$set:{'updated':record.updated}},{w:0});
									
									if (show.users){
										show.users.forEach(function(u){
											userCollection.findOne({'_id': ObjectID(u._id),'trakt':{$exists:true}},{'trakt':1},function(error,user){
												if (error) logger.error(error)
												if (user && library) trakt(user.trakt).show.episode.library(show.tvdb, library);
											});
										});
									}
									if (typeof(callback) == 'function') callback(error, {show:show, trash:nconf.get('media:shows:autoclean')})
								});
							});
						}
					});
					
				}
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	download: function(tvdb, filter, callback){
		var self = this, tvdb = parseInt(tvdb,10);
		showCollection.find({'tvdb':tvdb}, function(error,show){
			if (error) logger.error(error);
			if (show){
				var addTorrent = function(hash,id){
					var magnet = helper.createMagnet(hash);
					torrent.add(magnet, function(error,args){
						if (error) logger.error(error);
						if (args) episodeCollection.update({'_id':ObjectID(id)},{$set:{'downloading':true,'status':false}},{'w':0});
					});
				};
				var search = {'tvdb':show.tvdb,$or:[{'hashes.hash':{$exists:true}},{'hash':{$exists:true}}]};
				if (filter.season) search.season = parseInt(filter.season,10);
				if (filter.episode) search.episode = parseInt(filter.episode,10);
				episodeCollection.find(search).toArray(function(error,episodes){
					if (error) logger.error(error);
					if (episodes){
						episode.forEach(function(episode){
							if (episode.file) return;
							if (episode.hashes.length){
								if (episodes.hashes.length == 1){
									var magnet = helper.createMagnet(episodes.hashes[0].hash);
									addTorrent(magnet,episode._id);
								} else {
									var hd = show.hd || nconf.get('media:shows:hd') || false;
									var hashes = episode.hashes.filter(function(hash){
										if (hash.hd == hd) return true;
										return false;
									});
									hashes.forEach(function(hash){
										addTorrent(hash.hash,episode._id);
									});
								}
							} else if (episode.hash){
								var magnet = helper.createMagnet(result.hash);
								addTorrent(magnet,episode._id);
							}
						});
					}
					if (typeof(callback) == 'function') callback(error, (episodes.length)?show.tvdb:false);
				});
			}
		});
	},
	downloadAll: function(tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		self.download(tvdb, {}, callback);
	},
	latest: function(user, callback){
		var self = this;
		
		var lastweek = Math.round(new Date()/1000) - (7*24*60*60);
		
		var count = 0, list = [];
		
		showCollection.find({'users._id': ObjectID(user._id)},{'progress':0,'seasons':0,'synopsis':0}).toArray(function(error, shows){
			if (error) logger.error(error);
			if (!shows) return;
			
			shows.forEach(function(show){
				episodeCollection.find({
					file: {$exists: true},
					airdate: {$gt: lastweek-1},
					tvdb: show.tvdb
				}).toArray(function(error, episodes){
					count++;
					if (error) return logger.error(error);
					var seasons = [], progress = {};
					
					show.users.forEach(function(u){
						if (!user._id.equals(u._id)) return;
						if (u.progress) progress = u.progress;
						if (u.seasons) viewed = u.seasons;
					});
					
					if (episodes.length){
						episodes.forEach(function(episode){
							try {
								episode.show_name = show.name;
								episode.watched = false;
								if (viewed){
									viewed.forEach(function(season){
										if (season.season != episode.season) return;
										episode.watched = !!season.episodes[episode.episode];
									});
								}
							} catch(e){
								logger.error(e.message);
							}
							list.push(episode);
						});
					}
					if (count == shows.length && typeof(callback) == 'function') callback(null, list);
				});
			});
		});
	},
	list: function(user, callback){
		try {
			showCollection.find({'users._id': ObjectID(user._id)}).toArray(callback);
		} catch(e){
			logger.error(e.message);
		}
	},
	random: function(user, callback){
		var self = this, deferred = Q.defer();
		try {
			showCollection.find({'users._id': ObjectID(user._id), 'users.progress.percentage': {$lt: 100}, 'users.progress.next': {$exists: true}}).toArray(function(error, shows){
				if (error) logger.error(error);
				if (shows.length){
					var rand = Math.round(Math.random()*shows.length), show = shows[rand];
					if (show) {
						var response = {'show':show,'episode':{},'progress':{}};
						show.users.forEach(function(u){
							if (!user._id.equals(u._id)) return
							response.progress = u.progress;
						});
						if (response.progress.next){
							episodeCollection.findOne({'tvdb':show.tvdb,'season':response.progress.next.season,'episode':response.progress.next.number}, function(error, episode){
								if (error) return logger.error(error)
								if (episode) response.episode = episode;
								deferred.resolve(response);
							});
						}
					}
				}
			});
			deferred.promise.then(function(response){
				if (typeof(callback) == 'function') callback(null,response);
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	remove: function(user, tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		try {
			showCollection.findOne({'tvdb':tvdb}, function(error, show){
				if (error) logger.error(error);
				if (show){
					trakt(user.trakt).show.unlibrary(show.tvdb);
					var update = {$pull: {'users':{'_id':ObjectID(user._id)}}};
					if (show.users.length == 1) update.$set = {status: false};
					showCollection.update({'tvdb': tvdb}, update, {'w':0});
				}
				if (typeof(callback) == 'function') callback(error);
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	
	scan: function(user, callback){
		var self = this;
		self.scanShows(user, function(error,tvdb){
			self.scanEpisodes(tvdb);
		});
	},
	
	scanEpisodes: function(tvdb,callback){
		var self = this, tvdb = parseInt(tvdb,10);
		var exts = ['.avi','.mkv','.mp4'];
		
		showCollection.findOne({'tvdb':tvdb,'directory':{$exists:true}}, function(error,show){
			if (error) logger.error(error);
			if (show){
				var showdir = nconf.get('media:base')+nconf.get('media:shows:directory')+'/'+show.directory;
				helper.listDirectory(showdir, function(error,result){
					var file = result.path.replace(showdir+'/', '');
					if (exts.indexOf(path.extname(file)) == -1) return;
					var meta = self.getEpisodeNumbers(file);
					if (meta && meta.episodes){
						self.getFilename(file,show).then(function(filename){
							var record = {
								'status': true,
								'file': filename,
								'updated': new Date()
							};
							if (!record.file || record.file == file) return;
							helper.fileMove(result.path, showdir+'/'+record.file, function(){
								episodeCollection.update({'tvdb':show.tvdb,'season':meta.season,'episode':{$in:meta.episodes}},{$set:record},{'w':0});
							});
						});
					}
				});
			}
		});
	},
	scanShows: function(user, callback){
		var self = this;
		
		logger.debug('Scanning show library...');
		var base =  nconf.get('media:base') + nconf.get('media:shows:directory')
		fs.readdir(base, function(error, dirs){
			if (error) logger.error(error);
			dirs.forEach(function(dir){
				fs.lstat(base + '/' + dir, function(error, stat){
					if (error) return;
					if (stat && stat.isDirectory()){
						showCollection.findOne({$or:[{'name':dir},{'directory':dir}],'tvdb':{$exists:true}},function(error,show){
							if (error) logger.error(error);
							if (show){
								var record = {
									'status': false,
									'directory': dir,
									'updated': new Date()
								};
								showCollection.update({'tvdb':show.tvdb},{$set:record},{'w':0})
								if (typeof(callback) == 'function') callback(error, show.tvdb);
							} else {
								trakt(user.trakt).search('shows', dir, function(error, results){
									if (error) logger.error(error);
									if (results){
										if (results.length == 1){
											self.add(user, parseInt(results[0].tmdb_id,10), function(error, tvdb){
												if (typeof(callback) == 'function') callback(error, tvdb);
											});
										} else {
											var filtered = results.filter(function(result){
												var include = true;
												dir.replace(/[^\w\s]/ig).split(' ').forEach(function(word){
													if (result.title.indexOf(word.trim()) == -1) include = false;
												});
												return include;
											});
											if (filtered.length == 1){
												self.add(user, parseInt(filtered[0].tmdb_id,10), function(error, tvdb){
													if (typeof(callback) == 'function') callback(error, tvdb);
												})
											} else {
												var record = {
													'type':'shows',
													'directory': dir,
													'matches': filtered
												};
												unmatchedCollection.update({'directory':dir},{$set:record},{'upsert':true,'w':0});
											}
										}
									} else {
										var record = {
											'type':'show',
											'directory': dir
										};
										unmatchedCollection.update({'directory':dir},{$set:record},{'upsert':true,'w':0});
									}
								});
							}
						});
					}
				});
			});
		});
	},
	sync: function(user, callback){
		var self = this;
		try {
			trakt(user.trakt).user.library.shows.all(function(error, shows){
				logger.debug('Syncing show library...');
				if (error) logger.error(error);
				if (shows){
					logger.debug('Show library: ', shows.length);
					shows.forEach(function(show){
						var record = {
							'name': show.title,
							'year': parseInt(show.year, 10),
							'url': show.url.split('/').pop(),
							'status': (show.status == 'Ended') ? false:true,
							'synopsis': show.overview,
							'imdb': show.imdb_id,
							'tvdb': parseInt(show.tvdb_id,10),
							'genres': show.genres,
							'updated': new Date()
						};
						showCollection.update({'tvdb':record.tvdb},{$set:record},{'upsert':true},function(error,affected,status){
							if (error) logger.error(error);
							if (affected){
								self.addUser(user, record.tvdb);
								self.getArtwork(record.tvdb);
								self.getFeed(record.tvdb)
							}
						});
					});
				}
				if (typeof(callback) == 'function') callback(error, shows.length);
			});
		} catch(e){
			logger.error('Show sync: ', e.message);
		}
	},
	unmatched: function(callback){
		unmatchedCollection.find({'type':'show'}).toArray(callback);
	},
	
	
	addUser: function(user,tvdb){
		var self = this, tvdb = parseInt(tvdb,10);
		showCollection.find({'tvdb':tvdb,'users._id':ObjectID(user._id)},{'tvdb':1,'users':1},function(error,show){
			if (error) logger.error(error);
			if (!show){
				var record = {
					'_id': ObjectID(user._id),
					'username': user.username
				};
				showCollection.update({'tvdb':show.tvdb},{$addToSet:record},function(error,affected){
					if (error) logger.error(error);
					if (affected) self.getProgress(user, show.tvdb);
				});
			}
		});
	},
	getArtwork: function(tvdb, callback){
		var self = this, tvdb = parseInt(tvdb,10);
		var http = require('http');
		showCollection.findOne({'tvdb':tvdb}, function(error, show){
			if (error) logger.error(error);
			if (show){
				userCollection.findOne({'admin':true,'trakt':{$exists:true}},{trakt:1},function(error,user){
					if (error) logger.error(error);
					if (user){
						trakt(user.trakt).show.summary(show.tvdb, function(error, json){
							if (json.images.banner){
								var banner = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/banner.jpg', {flags: 'w', mode: 0644});
								banner.on('error', function(e){
									logger.error(e);
								});
								var request = http.get(json.images.banner, function(response){
									response.pipe(banner);
								});
							}
							if (json.images.poster) {
								var src = json.images.poster.replace('.jpg', '-138.jpg');
								var poster = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/poster.jpg', {flags: 'w', mode: 0644});
								poster.on('error', function(e){
									logger.error(e);
								});
								var request = http.get(src, function(response){
									response.pipe(poster);
								});
							}
						});
					}
				});
			}
			if (typeof(callback) == 'function') callback(error, show.tvdb);
		});
	},	
	getEpisodeNumbers: function(file){
		var file = file.toString();
		var regexp	= /(?:[a-z]+)?\s?(\d{1,2})(?:\:[\w\s]+)?[\/\s]?(?:E|x|[a-z]{2,})?\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}/i;
		var abdexp	= /(\d{4})\D?(\d{2})\D?(\d{2})/i;
		
		if (match = file.match(regexp)) {
			if (match[1] && match[2]) {
				var response = {
					type: 'seasons',
					season: null,
					episodes: []
				};
				var episode	= null;
				response.season = parseInt(match[1], 10);
				
				if (match[3]) {
					for (i = match[2]; i <= match[3]; i++) {
						response.episodes.push(parseInt(i, 10));
					}
				} else {
					// Single episode
					response.episodes.push(parseInt(match[2], 10));
				}
			}
			
		} else if (match = file.match(abdexp)) {
			// Air By Date (e.g. Colbert Report, Daily Show, Neighbours, etc)
			var reponse = {
				type: 'ABD',
				year: match[0],
				month: parseInt(match[1], 10),
				day: parseInt(match[2], 10)
			};
		}
		return (response !== undefined) ? response : false;		
	},
	getFeed: function(tvdb,callback){
		var self = this, tvdb = parseInt(tvdb,10);
		var options = {
			url: 'http://tvshowsapp.com/showlist/showlist.xml',
			headers: {
				'User-Agent': 'TVShows 2 (http://tvshowsapp.com/)'
			}
		};
		request.get(options, function(error, req, xml){
			if (error) logger.error(error);
			try {
				parser.parseString(xml, function(error, json){
					if (error) return logger.error(error);
					json.shows.show.forEach(function(show){
						if (parseInt(show.tvdb,10) != tvdb) return;
						var record = {
							'feed': helper.fixFeedUrl(show.mirrors[0].mirror[0])
						};
						showCollection.update({'tvdb':tvdb,'feed':{$exists:false}},{$set:record},{w:0});
					});
				});
			} catch(e){
				logger.error(e.message);
			}
		});
	},
	getFilename: function(file,show){
		// Generate a friendly filename
		var deferred = Q.defer(), self = this;
		
		var file = (typeof(file) == 'object' && file.name) ? file.name : file;
		
		var numbers = self.getEpisodeNumbers(file);
		var settings = {
			'format': show.format || nconf.get('media:shows:format'),
			'filext': path.extname(file).replace(/^\./,'')
		};
		var token = {
			'S': null,
			'E': null,
			'T': [],
			'X': settings.filext,
		};
		var values = [];
		
		episodeCollection.find({'tvdb':show.tvdb,'season':numbers.season,'episode':{$in:numbers.episodes}}).toArray(function(error,episodes){
			if (error) logger.error(error);
			if (episodes){
				episodes.forEach(function(episode){
					values.push({'episode':episode.episode,'title':episode.title.trim()});
				});
				if (values.length>1){
					values.sort(function(a,b){
						if (a.episode < b.episode) return -1;
						if (a.episode > b.episode) return 1;
						return 0;
					});
					token.E = [helper.zeroPadding(values[0].episode), helper.zeroPadding(values[values.length-1].episode)].join('-');
					values.forEach(function(value){
						token.T.push(value.title)
					})
					token.T = token.T.join('; ')
				} else {
					token.E = helper.zeroPadding(values[0].episode);
					token.T = values[0].title.trim();
				}
				token.S = helper.zeroPadding(numbers.season);
				token.X = settings.filext;
				
				var filename = settings.format.replace(/%(\w)/g, function(match, key){			
					return token[key];
				});
				deferred.resolve(filename);
			}
		});
		return deferred.promise;
	},
	getHashes: function(tvdb, callback){
		var self = this, tvdb = parseInt(tvdb,10);
		// Get all the hashes we can find, and add them to the database
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show || !show.feed) return;
			show.feed = helper.fixFeedUrl(show.feed, true);
			helper.parseFeed(show.feed, null, function(error, item){
				if (error) logger.error(error);
				if (item){
					try {
						var record = {
							'hd': item.hd,
							'hash': item.hash,
							'quality': (item.hd) ? 'HD':'SD',
							'repack': item.repack
						};
						episodeCollection.update({'tvdb':tvdb,'season':item.season,'episode':{$in:item.episodes}}, {$addToSet:{'hashes':record}},{'w':0});
					} catch(e){
						logger.error(e.mesage);
					}
				}
			});
			if (typeof(callback) == 'function') callback(error,tvdb);
		});
	},
	getListings: function(tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		userCollection.findOne({'admin':true,'trakt':{$exists:true}},{trakt:1}, function(error, user){
			if (error) logger.error(error);
			if (user){
				trakt(user.trakt).show.seasons(tvdb, function(error, seasons){
					if (seasons.length){
						var count = 0;
						var total = seasons.length;
						seasons.forEach(function(season){
							trakt(user.trakt).show.season.info(tvdb, season.season, function(error, episodes){
								count++;
								if (episodes.length){
									episodes.forEach(function(episode){
										episode.tvdb = tvdb;
										self.setEpisode(episode);
									});
								}
								if (count == total) {
									if (typeof(callback) == 'function') callback(null, tvdb);
								}
							});
						});
					}
				});
			}
		});
	},
	
	
	
	/***** Old methods below *****/
		
	episodes: function(user, tvdb, callback){
		var tvdb = parseInt(tvdb, 10);
		
		showCollection.findOne({tvdb: tvdb, 'users._id': ObjectID(user._id)}, function(error, show){
			if (error) return logger.error(error);
			if (show){
				var listings = [], progress = {}, response = [], seasons = [], viewed = [];
				
				episodeCollection.find({tvdb: show.tvdb}).sort({season:1,episode:1}).toArray(function(error, episodes){
					if (error) return logger.error(error);
					
					show.users.forEach(function(u){
						if (!user._id.equals(u._id)) return;
						if (u.progress) progress = u.progress;
						if (u.seasons) viewed = u.seasons;
					});
					
					if (episodes.length){
						episodes.forEach(function(episode){
							episode.watched = false;
							if (viewed) {
								viewed.forEach(function(view){
									if (view.season != episode.season) return;
									episode.watched = !!view.episodes[episode.episode];
								});
							}
							if (seasons.indexOf(episode.season) == -1) seasons.push(episode.season);
							if (!listings[episode.season]) listings[episode.season] = [];
							listings[episode.season].push(episode);
						});
						seasons.forEach(function(season){
							var record = {
								season: season,
								episodes: listings[season]
							}
							response.push(record);
						});
					}
					if (typeof(callback) == 'function') callback(null, response);
				});
			}
		});
	},
		
	
	progress: function(user, tvdb, callback){
		// Get user progress for a specific show
		try {
			showCollection.findOne({tvdb: parseInt(tvdb, 10), 'users._id': ObjectID(user._id)}, function(error, show){
				if (error) logger.error(error);
				if (show) {
					var progress = {};
					show.users.forEach(function(u){
						if (!user._id.equals(u._id)) return;
						if (u.progress) progress = u.progress;
					});
					if (typeof(callback) == 'function') callback(null, progress);
				}
			});
		} catch(e){
			logger.error(e.message);
		}
	},
		
	search: function(user, query, callback){
		if (!user.trakt) return;
		try {
			trakt(user.trakt).search('shows', query, callback);
		} catch(e){
			logger.error(e.message);
		}
	},
	
	settings: function(user, data, callback){
		var record = {
			feed: data.feed,
			hd: !!data.hd,
			status: !!data.status
		};
		showCollection.update({_id: ObjectID(data._id), 'users._id': ObjectID(user._id)}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	summary: function(user, tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var self = this;
		showCollection.findOne({tvdb: tvdb, 'users._id': ObjectID(user._id)}, function(error, show){
			if (error || !show) return;
			self.episodes(user, show.tvdb, function(error, seasons){
				var response = {
					show: show,
					listing: seasons
				};
				show.users.forEach(function(u){
					if (!user._id.equals(u._id)) return;
					if (u.progress) response.progress = u.progress;
					if (u.seasons) response.seasons = u.seasons;
				});
				if (typeof(callback) == 'function') callback(null, response);
			});
		});
	},
	
	
	update: function(){
		var self = this;
		
		self.sanitize();
		/*
		userCollection.find({}).toArray(function(error, users){
			users.forEach(function(user){
				// Add all enabled shows to user
				// self.add(user, 
					// get show progress per user
			});
		});
		*/
	},
	
	
	match: function(matches, callback){
		var self = this;
		
		matches.forEach(function(match){
			unmatchedCollection.findOne({_id: ObjectID(match.id)}, function(error, row){
				trakt(user.trakt).show.summary(parseInt(match.tvdb, 10), function(error, json){
					var record = {
						directory: row.directory,
						status: !!row.status,
						name: json.title,
						tvdb: parseInt(match.tvdb, 10)
					};
					showCollection.update({tvdb: parseInt(match.tvdb, 10)}, {$set: record}, {upsert: true}, function(error, affected){
						unmatchedCollection.remove({_id: ObjectID(match.id)}, function(error, affected){
							// Removed from unmatched list
						});
						if (typeof(callback) == 'function') callback(error, match.tvdb);
					});
				});
			});
		});
	},
	
	watched: function(user, tvdb, json, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		if (json.season) {
			if (json.episode) {
				if (json.watched){
					// Flag episode as seen
					trakt(user.trakt).show.episode.seen(tvdb, json.season, json.episode, function(error, data){
						self.getProgress(user, tvdb);
					});
				} else {
					// Flag episode as unseen
					trakt(user.trakt).show.episode.unseen(tvdb, json.season, json.episode, function(error, data){
						self.getProgress(user, tvdb);
					});
				}
			} else {
				if (json.watched){
					// Flag season as seen
					trakt(user.trakt).show.season.seen(tvdb, json.season, function(){
						shows.getProgress(user, tvdb);
					});
				} else {
					// Flag season as unseen
					trakt(user.trakt).show.season.unseen(tvdb, json.season, function(){
						shows.getProgress(user, tvdb);
					});
				}
			}
		}
	//	if (typeof(callback) == 'function') callback(null, status);
	},
	
	/******************************************************/
	
	getCount: function(callback){
		episodeCollection.count({file: {$exists: true}}, function(error, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	getEpisode: function(tvdb, season, episode, callback){
		tvdb = parseInt(tvdb, 10);
		trakt(user.trakt).show.episode.summary(tvdb, season, episode, function(error, episode){
			episode.tvdb = tvdb;
			self.setEpisode(episode, function(error, response){
				if (typeof(callback) == 'function') callback(null, true);
			});
		});
	},
	
	getFullListings: function(tvdb, callback){
		// DEPRECATED
		var self = this, tvdb = parseInt(tvdb, 10);
		self.getListings(tvdb, callback);
	},
		
	getLatest: function(){
		var self = this;
		// Check each of the feeds for new episodes
		
		showCollection.find({
			status: true,
		//	ended: {$exists: false},
			feed: {$exists: true, $ne: null}
		}).toArray(function(error, shows){
			if (error || !shows) return;
			shows.forEach(function(show){
				var limit = new Date() - (1000*7*24*60*60);
				helper.parseFeed(show.feed, limit, function(error, json){
					if (error || !json.hash) return;
					if (!!show.hd != json.hd) return;
					
					episodeCollection.find({
						tvdb: show.tvdb,
						season: json.season,
						episode: {$in: json.episodes}
						
					}).toArray(function(error, episodes){
						if (error) return;
						
						var insert = false;
						var obtain = false;
						
						episodes.forEach(function(episode){
							if (!episode.status && !episode.file) obtain = true;
							if (!episode.hash) insert = true;
							if (json.repack && json.hash != episode.hash) {
								try {
									torrent.repacked(episode.hash);
									self.deleteEpisode(show.tvdb, json.season, json.episodes);
									insert = true;
									obtain = true;
								} catch(e) {
									logger.error(e.message);
								}
							}
						});
						if (insert) {
							episodeCollection.update({
								tvdb: show.tvdb,
								season: json.season,
								episode: {$in: json.episodes}
							}, {$set: {hash: json.hash}}, {w: 0});
						}
						if (obtain) {
							var magnet = helper.createMagnet(json.hash);
							torrent.add(magnet, function(error, args){
								if (error) return;
								if (args){
									episodeCollection.update({hash: json.hash}, {
										$set: {
											hash: args.hashString.toUpperCase(),
											status: false
										}
									}, {w: 0});
								}
							});
							self.getListings(show.tvdb);
						} 
					});
				});
			});
		});
	},
	
	getProgress: function(user, tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		trakt(user.trakt).user.progress.watched(tvdb, function(error, response){
			if (error) return logger.error(error);
			if (response.length){
				response[0].progress.next = response[0].next_episode;
				showCollection.update({tvdb: tvdb, 'users._id': ObjectID(user._id)}, {$set: {'users.$.progress': response[0].progress, 'users.$.seasons': response[0].seasons}}, {w:0});
			}
			if (typeof(callback) == 'function') callback();
		});
	},
	
	getShowlist: function(callback){
		
		var self = this;
		// Get the latest showlist feed from TVShows and add new entries into the local database
		var options = {
			url: 'http://tvshowsapp.com/showlist/showlist.xml',
			headers: {
				'User-Agent': 'TVShows 2 (http://tvshowsapp.com/)'
			}
		};
		request.get(options, function(error, req, xml){
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					if (error) return;
					json.shows.show.forEach(function(show){
						var record = {
							name: show.name[0],
							tvdb: parseInt(show.tvdbid[0], 10),
							feed: helper.fixFeedUrl(show.mirrors[0].mirror[0])
						};
						showCollection.findOne({tvdb: record.tvdb}, function(error, row){
							if (error) return;
							if (!row){
								// New show: Add to local DB
								showCollection.insert(record, function(error, affected){
									if (error) return;
									self.getSummary(record.tvdb);
								});
							} else {
								if (!row.feed || row.feed == '') {
									// Add the feed to the show record
									showCollection.update({tvdb: record.tvdb}, {$set: {feed: record.feed}}, function(error, affected){
										if (error) return;
										self.getSummary(record.tvdb);
									});
								}
							}
						});
					});
				});
			} catch(e) {
				logger.error('showdata.getShowlist', e.message);
			}
		});
	},
	
	sanitize: function() {
		// Remove unused values from the show documents
		showCollection.update({status: {$exists: true}}, {$unset: {seasons: '', progress: '', trakt: ''}}, {w:0, multi: true});
	},
	
	getSummary: function(tvdb, callback){
		var tvdb = parseInt(tvdb, 10);
		userCollection.findOne({admin: true}, {trakt:1}, function(error, admin){
			trakt(admin.trakt).show.summary(tvdb, function(error, json){
				if (error) return logger.error(error);
				showCollection.findOne({tvdb: tvdb}, function(error, show){
					if (error) return logger.error(error);
					if (show && json){
						show.name = json.title;
						show.imdb = json.imdb_id;
						show.genres = json.genres;
						show.synopsis = json.overview;
						
						switch (json.status){
							case 'Ended':
								show.ended = true;
								break;
							case 'Continuing':
							default:
								show.ended = false;
						}
						showCollection.save(show, function(error, result){
							if (typeof(callback) == 'function') callback(error, tvdb);
						});
					}
				});
			});
		});
	},
	
	getUnmatched: function(callback){
		unmatchedCollection.find({type:'show'}).toArray(callback);
	},
	
	getUnwatched: function(callback){
		// Get a list of all unwatched episodes
		var where = {
			hash: {$exists: true},
			file: {$exists: true},
			watched: false
		};
		episodeCollection.find(where).toArray(function(error, episodes){
			var response = {};
			episodes.forEach(function(episode){
				if (!response[episode.tvdb]) {
					response[episode.tvdb] = [];
				}
				response[episode.tvdb].push(episode);
			});
			if (typeof(callback) == 'function') callback(error, response);
		});
	},
	
	/******************************************************/
	
	deleteEpisode: function(tvdb, season, episodes){
		tvdb = parseInt(tvdb, 10);
		var where = {
			tvdb: tvdb,
			season: season,
			episode: {$in: episodes}
		};
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			episodeCollection.find(where).toArray(function(error, results){
				if (error || !results.length) return;
				results.forEach(function(result){
					if (result.file) {
						fs.unlink(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/' + result.file, function(error){
							if (error) logger.error('showdata.deleteEpisode', error);
						});
					}
				});
				var update = {file: '', status: ''};
				episodeCollection.update(where, {$unset: update}, {w: 0});
			});
		});
	},
	
	setEpisode: function(episode, callback) {
		var record = {
			tvdb: parseInt(episode.tvdb,10),
			season: parseInt(episode.season,10),
			episode: parseInt(episode.episode,10),
			title: episode.title,
			synopsis: episode.overview,
			airdate: new Date(episode.first_aired*1000),
			watched: episode.watched,
			users: []
		};
		episodeCollection.update({tvdb: record.tvdb, season: record.season, episode: record.episode}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected)
		});
	}
	
};
exports = module.exports = ShowData;