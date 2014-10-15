var extend	= require('xtend'),
	fs		= require('fs'),
	http	= require('http'),
	log4js	= require('log4js'),
	mkdir	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
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

var ShowData = {
	
	add: function(user, tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		// Get show info from trakt
		trakt(user.trakt).show.summary(tvdb, function(error, json){
			// Update shows collection
			showCollection.findOne({tvdb: tvdb}, function(error, record){
				if (error) logger.error(error);
				if (record) {
					// It is known. Update document
					if (json.imdb_id) record.imdb = json.imdb_id;
					if (json.overview) record.synopsis = json.overview;
					record.name = json.title;
					record.status = (record.feed) ? true : false;
					if (!record.users) record.users = [];
				} else {
					// New show, create document
					var record = {
						ended: false,
						genres: json.genres,
						imdb: json.imdb_id,
						name: json.title,
						status: false,
						synopsis: json.overview,
						tvdb: parseInt(json.tvdb_id, 10),
						users: []
					};
				}
				var createDir = false;
				if (record.directory){
					// Does the directory actually exist?
					var dir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + record.directory;
					if (!fs.existsSync(dir)) createDir = true
				} else {
					// Create directory
					record.directory = helper.formatDirectory(record.name);
					createDir = true;
				}
				if (createDir){
					var dir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + record.directory;
					mkdir(dir, 0775, function(error){
						if (error) logger.error(error);
					});
				}
				
				// Add user to show.users
				if (record.users.length){
					var found = false;
					record.users.forEach(function(u){
						if (ObjectID(u._id) == ObjectID(user._id)) found = true;
					});
					if (found) {
						record.users.push({_id: ObjectID(user._id), username: user.username});
					} else {
						self.getProgress(user, tvdb);
					}
				}
				// Save show record
				showCollection.save(record, {safe: true}, function(error, result){
					if (error) return logger.error(error);
					trakt(user.trakt).show.library(tvdb, function(error, json){
						userCollection.update({_id: ObjectID(user._id)}, {$push: {shows: {trakt: true, tvdb: tvdb, progress: []}}}, {w:0});
					});
					if (typeof(callback) == 'function') callback(error, tvdb);
				});
			});
		});
		return;
	},
	
	download: function(tvdb, data, callback){
		tvdb = parseInt(tvdb, 10);
		
		var search = {tvdb: tvdb};
		if (data.season) search.season = data.season;
		if (data.episode) search.episode = data.episode;
		
		episodeCollection.find(search, {hash:1}).toArray(function(error, results){
			if (error) return logger.error(error);
			results.forEach(function(result){
				if (!result.hash) return;
				var magnet = helper.createMagnet(result.hash);
				if (magnet) {
					torrent.add(magnet, function(error, args){
						if (error) {
							console.error(error);
							return;
						}
						if (args){
							episodeCollection.update({hash: result.hash}, {
								$set: {hash: args.hashString.toUpperCase(), status: false}
							}, {w: 0});
						}
					});
				}
			});
		});
	},
	
	downloadAll: function(tvdb, callback){
		// Download all available episode, except the ones we already have
		tvdb = parseInt(tvdb, 10);
		episodeCollection.find({tvdb: tvdb}).toArray(function(error, results){
			if (error) logger.error(error);
			results.forEach(function(result){
				if (!result.hash || result.file) return;
				var magnet = helper.createMagnet(result.hash);
				if (magnet) {
					torrent.add(magnet, function(error, args){
						if (error) {
							logger.error(error);
							return;
						}
						if (args){
							episodeCollection.update({hash: result.hash}, {
								$set: {
									hash: args.hashString.toUpperCase(),
									status: false
								}
							}, {w: 0});
						}
					});
				}
			});
		//	if (typeof(callback) == 'function') callback()
		});
	},
	
	episodes: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		episodeCollection.find({tvdb: tvdb}).toArray(function(error, results){
			var seasons = [], episodes = [], response = [];
			results.forEach(function(result){
				if (seasons.indexOf(result.season) == -1) seasons.push(result.season);
				if (!episodes[result.season]) episodes[result.season] = [];
				result.watched = false;
				episodes[result.season].push(result);
			});
			seasons.forEach(function(season){
				var record = {
					season: season,
					episodes: episodes[season]
				}
				response.push(record);
			});
			if (typeof(callback) == 'function') callback(null, response);
		});
	},
		
	latest: function(user, callback){
		var self = this;
		var lastweek = Math.round(new Date()/1000) - (7*24*60*60);
		
		var list = [], shows = [];
		userCollection.findOne({_id: ObjectID(user._id)}, function(error, result){
			if (error) logger.error(error);
			if (!result.shows) return;
			result.shows.forEach(function(show){
				shows.push(show.tvdb);
			});
			
			episodeCollection.find({
				file: {$exists: true},
				airdate: {$gt: lastweek-1},
				tvdb: {$in: shows}
				
			}).toArray(function(error, episodes){
				if (error){
					logger.error(error);
					return;
				}
				var count = 0;
				if (episodes.length){
					episodes.forEach(function(episode){
						showCollection.findOne({tvdb: episode.tvdb}, function(error, show){
							count++;
							var item = episode;
							item.show_name = show.name;
							item.tvdb = show.tvdb;
							
							result.shows.forEach(function(show){
								if (show.tvdb != episode.tvdb) return;
								if (show.progress == 100) {
									item.watched = true;
								} else {
									// loop
									if (!show.seasons) return;
									show.seasons.forEach(function(season){
										if (season.season != item.season) return;
										item.watched = !!season.episodes[item.episode];
									});
								}
							});
							list.push(item);
							if (episodes.length == count && typeof(callback) == 'function') callback(null, list);
						});
					});
				}
			});
		});
	},
	
	list: function(user, callback){
		try {
			showCollection.find({users: {$elemMatch: {_id: ObjectID(user._id)}}}).toArray(callback);
		} catch(e){
			logger.error(e.message);
		}
	},
	
	progress: function(user, tvdb, callback){
		// Get user progress for a specific show
		try {
			userCollection.findOne({"_id": ObjectID(user._id), "shows.tvdb": tvdb}, function(error, json){
				if (error) logger.error(error);
				if (json && json.shows.length){
					var progress = {};
					json.shows.forEach(function(show){
						if (show.tvdb != tvdb) return;
						progress = show.progress;
					});
					callback(null, progress);
				}
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	
	remove: function(user, tvdb, callback){
		// Remove a show from your library
		var tvdb = parseInt(tvdb, 10);
		try {
			showCollection.findOne({tvdb: tvdb}, function(error, show){
				trakt(user.trakt).show.unlibrary(tvdb);
				var update = {
					$pull: {users: {_id: ObjectID(user._id)}}
				};
				if (show.users.length == 1) update.$set = {status: false};
				showCollection.update({tvdb: tvdb}, update, {w:0});
				userCollection.update({_id: ObjectID(user._id)}, {$pull: {shows: {tvdb: tvdb}}}, callback);
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
			hd: !!data.hd
		};
		showCollection.update({_id: ObjectID(data._id), 'users._id': ObjectID(user._id)}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	summary: function(user, tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var self = this;
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			self.episodes(show.tvdb, function(error, episodes){
				var response = {
					displaypath: nconf.get('media:base') + nconf.get('media:shows:directory') + '/' +show.directory,
					show: show,
					listing: episodes,
					progress: {},
					seasons: []
				};
				if (show.users) {
					show.users.forEach(function(u){
						if (user.username != u.username) return;
						if (u.progress) response.progress = u.progress;
						if (u.seasons) response.seasons = u.seasons;
					});
				}
				if (typeof(callback) == 'function') callback(null, response);
			});
		});
	},
	
	sync: function(user, callback){
		var self = this;
		// Synchronise all show data from trakt to local db
		try {
			trakt(user.trakt).user.library.shows.all(function(error, shows){
				shows.forEach(function(show){
					self.add(user, show.tvdb_id, function(error, tvdb){
						if (error) return logger.error(error);
						self.getProgress(user, tvdb);
					});
				});
			});
		} catch(e){
			logger.error('sync: ', e.message);
		}
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
	
	unmatched: function(callback){
		
		return;
		// rethink how this works
		
		unmatchedCollection.find().toArray(function(error, shows){
			userCollection.findOne({admin: true}, {trakt:1}, function(error, user){
				shows.forEach(function(show){
					trakt(user.trakt).search('shows', show.directory, function(error, json){
						var result = {
							id: show._id,
							name: show.directory,
							matches: json
						};
						if (typeof(callback) == 'function') callback(null, result);
					});
				});
			});
		});
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
	
	watched: function(user, tvdb, json){
		var self = this;
		var tvdb = parseInt(tvdb, 10);
		if (json.season) {
			if (json.episode) {
				// Flag episode as watched
				trakt(user.trakt).show.episode.seen(tvdb, json.season, json.episode, function(error, data){
					self.getProgress(user, tvdb);
				});
			} else {
				// Flag season as watched
				trakt(user.trakt).show.season.seen(tvdb, json.season, function(){
					shows.getProgress(user, tvdb);
				});
			}
		}
	//	if (typeof(callback) == 'function') callback(null, status);
	},
	
	/******************************************************/
	
	getArtwork: function(tvdb, callback){
		var self = this, tvdb = parseInt(tvdb, 10);
		
		logger.info('Fetching artwork');
		
		var http = require('http');
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			userCollection.findOne({admin: true}, {trakt:1}, function(error, admin){
				if (error || !admin) return logger.error(error);
				trakt(admin.trakt).show.summary(show.tvdb, function(error, json){
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
					if (typeof(callback) == 'function') callback(null, show.tvdb);
					show = null;
				});
			});
		});
	},
	
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
		var self = this, tvdb = parseInt(tvdb, 10);
		
		userCollection.findOne({admin: true}, {trakt:1}, function(error, user){
			trakt(user.trakt).show.seasons(tvdb, function(error, seasons){
				var count = 0;
				var total = seasons.length;
				seasons.forEach(function(season){
					trakt(user.trakt).show.season.info(tvdb, season.season, function(error, episodes){
						count++;
						episodes.forEach(function(episode){
							episode.tvdb = tvdb;
							self.setEpisode(episode);
						});
						if (count == total) {
							if (typeof(callback) == 'function') callback(null, tvdb);
						}
					});
				});
			});
		});
	},
	
	getHashes: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		// Get all the hashes we can find, and add them to the database
		
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show || !show.feed) return;
			show.feed = helper.fixFeedUrl(show.feed, true);
			helper.parseFeed(show.feed, null, function(error, item){
				if (error || !item.hash) return;
				if (!!show.hd != item.hd) return;
				var update	= {hash: item.hash};
				var where	= {
					tvdb: tvdb,
					season: item.season,
					episode: {
						$in: item.episodes || []
					}
				};
				if (!item.repack) where.hash = {$exists: false};
				episodeCollection.update(where, {$set: update}, function(error, affected){
					if (error) logger.error(error);
				});
				if (typeof(callback) == 'function') callback(null, tvdb);
			});
		});
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
							self.getFullListings(show.tvdb);
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
				showCollection.update({tvdb: tvdb, "users._id": ObjectID(user._id)}, {$set: {"users.$.progress": response[0].progress, "users.$.seasons": response[0].seasons}}, {w:0});
				userCollection.update({_id: ObjectID(user._id), "shows.tvdb": tvdb}, {$set: {"shows.$.progress": response[0].progress, "shows.$.seasons": response[0].seasons}}, {w:0});
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
				if (error) {
					logger.error(error);
					return;
				}
				showCollection.findOne({tvdb: tvdb}, function(error, show){
					if (error) logger.error(error);
					if (show){
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
		unmatchedCollection.find().toArray(callback);
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
			tvdb: episode.tvdb,
			season: episode.season,
			episode: episode.episode,
			title: episode.title,
			synopsis: episode.overview,
			airdate: episode.first_aired,
			watched: episode.watched,
			users: []
		};
		episodeCollection.update({tvdb: record.tvdb, season: record.season, episode: record.episode}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected)
		});
	}
	
};
exports = module.exports = ShowData;