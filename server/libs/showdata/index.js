var exec	= require('child_process').exec,
	extend	= require('xtend'),
	fs		= require('fs'),
	http	= require('http'),
	mkdir	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	util	= require('util');

var ObjectID = require('mongodb').ObjectID;

var ShowData = {
	
	add: function(tvdb, callback){
		var self = this;
		var tvdb = parseInt(tvdb, 10);
		var showCollection = db.collection('show');
		
		trakt.show.summary(tvdb, function(error, json){
			if (error) logger.error(error);
			showCollection.findOne({tvdb: tvdb}, function(error, record){
				if (error) logger.error(error);
				if (record) {
					record.imdb = json.imdb_id;
					record.name = json.title;
					record.status = (record.feed) ? true : false;
					record.synopsis = json.overview;
				} else {
					var record = {
						tvdb: parseInt(json.tvdb_id, 10),
						imdb: json.imdb_id,
						name: json.title,
						synopsis: json.overview,
						status: false
					};
				}
				if (!record.directory){
					record.directory = helper.formatDirectory(record.name);
					var dir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + record.directory;
					mkdir(dir, 0775, function(error){
						if (error) logger.error(error);
					});
				}
				showCollection.save(record, {safe: true}, function(error, result){
					if (typeof(callback) == 'function') callback(error, tvdb);
					record = null;
				});
			});
			json = null;
		});
		showCollection = null;
	},
	
	download: function(tvdb, season, episode, callback){
		tvdb = parseInt(tvdb, 10);
		var episodeCollection = db.collection('episode');
		episodeCollection.findOne({tvdb: tvdb, season: season, episode: episode}, function(error, result){
			if (error || !result.hash) return;
			var magnet = helper.createMagnet(result.hash);
			if (magnet) {
				torrent.add(magnet, function(error, args){
					if (error) return;
					episodeCollection.update({hash: result.hash}, {$set: {status: false}}, function(error, affected){
						
					});
				//	if (typeof(callback) == 'function') callback(error, args);
				});
				magnet = null;
			}
			result = null;
		});
	},
	
	episodes: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var episodeCollection = db.collection('episode');
		episodeCollection.find({tvdb: tvdb}).toArray(function(error, results){
			var seasons = [], episodes = [], response = [];
			
			results.forEach(function(result){
				if (seasons.indexOf(result.season) == -1) seasons.push(result.season);
				if (!episodes[result.season]) episodes[result.season] = [];
				episodes[result.season].push(result);
			});
			seasons.forEach(function(season){
				var record = {
					season: season,
					episodes: episodes[season]
				}
				response.push(record);
				record = null;
			});
			if (typeof(callback) == 'function') callback(null, response);
			seasons = episodes = response = null;
		});
	},
	
	fixData: function(){
		// Dev method - used to ensure TVDB IDs are integers
		var episodeCollection = db.collection('episode');
		episodeCollection.find({tvdb: {$type: 2}}).toArray(function(error, results){
			results.forEach(function(result){
				result.tvdb = parseInt(result.tvdb, 10);
				episodeCollection.save(result, function(error, affected){
					
				});
			});
			results = null;
		});
		var showCollection = db.collection('show');
		showCollection.find({tvdb: {$type: 2}}).toArray(function(error, results){
			results.forEach(function(result){
				result.tvdb = parseInt(result.tvdb, 10);
				showCollection.save(result, function(error, affected){
					
				});
			});
			results = null;
		});
	},
	
	latest: function(callback){
		var self = this;
		var lastweek = Math.round(new Date()/1000) - (7*24*60*60);
		
		var list = [];
		var episodeCollection = db.collection('episode');
		var showCollection = db.collection('show');
		
		episodeCollection.find({
			file: {$exists: true},
			airdate: {$gt: lastweek-1, $lt: Math.round(new Date()/1000)}
		}).toArray(function(error, results){
			if (error){
				console.error(error);
				return;
			}
			var count = 0;
			if (results.length){
				results.forEach(function(result){
					showCollection.findOne({tvdb: result.tvdb}, function(error, show){
						var episode = result;
						episode.show_name = show.name;
						episode.tvdb = show.tvdb;
						if (typeof(callback) == 'function') callback(null, episode);
					});
				});
			}
			results = null;
		});
	},
	
	list: function(callback){
		var showCollection = db.collection('show');
		showCollection.find({status: {$exists: true}, directory: {$exists: true}}).toArray(callback);
	},
	
	remove: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var showCollection = db.collection('show');
		showCollection.update({tvdb: tvdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	search: function(query, callback){
		var showCollection = db.collection('show');
		trakt.search('shows', query, callback);
	},
	
	settings: function(data, callback){
		var showCollection = db.collection('show');
		if (data._id) delete data._id;
		showCollection.update({tvdb: data.tvdb}, {$set: data}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	summary: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var self = this;
		var showCollection = db.collection('show');
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			self.episodes(show.tvdb, function(error, episodes){
				var response = {
					summary: show,
					listing: episodes,
					total: {
						episodes: 0,
						watched: 0
					}
				};
				response.displaypath = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' +show.directory;
				
				episodes.forEach(function(seasons){
					seasons.episodes.forEach(function(episode){
						if (episode.watched) response.total.watched++;
						response.total.episodes++;
					});
				});
				if (typeof(callback) == 'function') callback(null, response);
			});
		});
	},
	
	unmatched: function(callback){
		var unmatchedCollection = db.collection('unmatched');
		unmatchedCollection.find({}).toArray(function(error, shows){
			shows.forEach(function(show){
				trakt.search('shows', show.directory, function(error, json){
					var result = {
						id: show._id,
						name: show.directory,
						matches: json
					};
					if (typeof(callback) == 'function') callback(null, result);
				});
			});
		});
	},
	
	match: function(matches, callback){
		var self = this;
		var unmatchedCollection = db.collection('unmatched');
		var showCollection = db.collection('show');
		matches.forEach(function(match){
			unmatchedCollection.findOne({_id: ObjectID(match.id)}, function(error, row){
				trakt.show.summary(parseInt(match.tvdb, 10), function(error, json){
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
	
	watched: function(tvdb, season, episode, callback){
		// Mark an episode as watched
		tvdb = parseInt(tvdb, 10);
		var record = {
			watched: true
		};
		var episodeCollection = db.collection('episode');
		episodeCollection.update({tvdb: tvdb, season: season, episode: episode}, {$set: record}, function(error, affected){
//			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	/******************************************************/
	
	getArtwork: function(tvdb, callback){
		var self = this;
		tvdb = parseInt(tvdb, 10);
		var http = require('http');
		var showCollection = db.collection('show');
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			trakt.show.summary(show.tvdb, function(error, json){
				if (json.images.banner){
					var banner = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/banner.jpg');
					banner.on('error', function(e){
						logger.error(e);
					});
					var request = http.get(json.images.banner, function(response){
						response.pipe(banner);
					});
				}
				if (json.images.poster) {
					var src = json.images.poster.replace('.jpg', '-138.jpg');
					var poster = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/poster.jpg');
					poster.on('error', function(e){
						logger.error(e);
					});
					var request = http.get(src, function(response){
						response.pipe(poster);
					});
				}
				if (typeof(callback) == 'function') callback(null, show.tvdb);
			});
			show = null;
		});
	},
	
	getCount: function(callback){
		var episodeCollection = db.collection('episode');
		episodeCollection.count({file: {$exists: true}}, function(error, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	getEpisode: function(tvdb, season, episode, callback){
		tvdb = parseInt(tvdb, 10);
		trakt.show.episode.summary(tvdb, season, episode, function(error, episode){
			episode.tvdb = tvdb;
			self.setEpisode(episode, function(error, response){
				if (typeof(callback) == 'function') callback(null, true);
			});
		});
	},
	
	getFullListings: function(tvdb, callback){
		var self = this;
		tvdb = parseInt(tvdb, 10);
		// Fetch episode listings
		trakt.show.seasons(tvdb, function(error, seasons){
			var count = 0;
			var total = seasons.length;
			seasons.forEach(function(season){
				trakt.show.season.info(tvdb, season.season, function(error, episodes){
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
	},
	
	getHashes: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		// Get all the hashes we can find, and add them to the database
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
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
						$in: item.episodes
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
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		// Check each of the feeds for new episodes
		showCollection.find({
			status: true,
			ended: {$exists: false},
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
									// TODO: log old hashes to db document
									// Only likely to happen IF the episode has multiple repacks
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
							}, {$set: {hash: json.hash}}, function(error, affected){
								if (error) return;
							});
						}
						
						if (obtain) {
							var magnet = helper.createMagnet(json.hash);
							torrent.add(magnet, function(error, args){
								if (error) return;
								episodeCollection.update({hash: json.hash}, {$set: {status: false}}, function(error, affected){
									if (error) return;
								});
							});
							self.getFullListings(show.tvdb);
						} 
					});
				});
			});
		});
	},
	
	getShowlist: function(callback){
		var self = this;
		var showCollection = db.collection('show');
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
	
	getSummary: function(tvdb, callback){
		tvdb = parseInt(tvdb, 10);
		var showCollection = db.collection('show');
		trakt.show.summary(tvdb, function(error, json){
			if (error) {
				logger.error(error);
				return;
			}
			showCollection.findOne({tvdb: tvdb}, function(error, show){
				show.name = json.title;
				show.imdb = json.imdb_id;
				show.synopsis = json.overview;
				
				if (json.status == 'Ended') {
					show.ended = true;
					if (show.status === true) show.status = false;
				}
				
				showCollection.save(show, function(error, result){
					if (typeof(callback) == 'function') callback(error, tvdb);
				});
			});
		});
	},
	
	getUnmatched: function(callback){
		var unmatchedCollection = db.collection('unmatched');
		unmatchedCollection.find().toArray(callback);
	},
	
	getUnwatched: function(callback){
		// Get a list of all unwatched episodes
		var episodeCollection = db.collection('episode');
		var showCollection = db.collection('show');
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
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
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
				episodeCollection.update(where, {$unset: update}, function(error, affected){
					if (error) return;
				});
			});
		});
	},
	
	setEpisode: function(episode, callback) {
		var episodeCollection = db.collection('episode');
		var record = {
			tvdb: episode.tvdb,
			season: episode.season,
			episode: episode.episode,
			title: episode.title,
			synopsis: episode.overview,
			airdate: episode.first_aired,
			watched: episode.watched
		};
		episodeCollection.update({tvdb: record.tvdb, season: record.season, episode: record.episode}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected)
		});
	}
	
};
exports = module.exports = ShowData;