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
		tvdb = parseInt(tvdb, 10);
		var self = this;
		var showCollection = db.collection('show');
		
		showCollection.findOne({tvdb: tvdb}, function(error, result){
			if (error) return;
			if (!result) {
				trakt.show.summary(tvdb, function(error, json){
					if (error) return;
					var record = {
						tvdb: parseInt(json.tvdb_id, 10),
						imdb: json.imdb_id,
						name: json.title,
						synopsis: json.overview,
						directory: helper.formatDirectory(json.title),
						status: true,
						feed: null
					};
					try {
						mkdir(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + record.directory, 0775);
					} catch(e){
						logger.error(e.message);
					}
					showCollection.insert(record, function(error, affected){
						if (typeof(callback) == 'function') callback(error, tvdb);
					});
				});
			} else {
				var record = {
					directory: helper.formatDirectory(result.name),
					status: true
				};
				showCollection.update({tvdb: tvdb}, {$set: record}, function(error, affected){
					if (typeof(callback) == 'function') callback(error, tvdb);
				});
			}
		});
	},
	
	download: function(tvdb, season, episode, callback){
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
			}
		});
	},
	
	episodes: function(tvdb, callback){
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
			});
			if (typeof(callback) == 'function') callback(null, response);
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
		});
		var showCollection = db.collection('show');
		showCollection.find({tvdb: {$type: 2}}).toArray(function(error, results){
			results.forEach(function(result){
				result.tvdb = parseInt(result.tvdb, 10);
				showCollection.save(result, function(error, affected){
					
				});
			});
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
			
			var count = 0;
			results.forEach(function(result){
				showCollection.findOne({tvdb: result.tvdb}, function(error, show){
					var episode = result;
					episode.show_name = show.name;
					episode.tvdb = show.tvdb;
					
					if (typeof(callback) == 'function') callback(null, episode);
				});
			});
		});
	},
	
	list: function(callback){
		var showCollection = db.collection('show');
		showCollection.find({status: {$exists: true}}).toArray(callback);
	},
	
	remove: function(tvdb, callback){
		var showCollection = db.collection('show');
		showCollection.update({tvdb: tvdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	search: function(query, callback){
		var showCollection = db.collection('show');
		showCollection.find({name: new RegExp(query, 'i'), status: {$exists: false}}).toArray(function(error, results){
			if (error) return;
			if (results.length){
				var response = [];
				results.forEach(function(result){
					var count = 0;
					trakt.show.summary(result.tvdb, function(error, json){
						json.feed = result.feed;
						response.push(json)
						count++;
						if (count == results.length) callback(null, response);
					});
				});
			} else {
				trakt.search('shows', query, callback);
			}
		});
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
				trakt.show.summary(match.tvdb, function(error, json){
					var record = {
						directory: row.directory,
						status: !!row.status,
						name: json.title,
						tvdb: match.tvdb
					};
					showCollection.update({tvdb: match.tvdb}, {$set: record}, {upsert: true}, function(error, affected){
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
		/*
		db.get("SELECT S.tvdb, E.id FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE S.id = ? AND E.season = ? AND E.episode = ?", id, season, episode, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			if (row === undefined) return;
			db.run("UPDATE show_episode SET watched = 1 WHERE id = ?", row.id);
			trakt.show.episode.seen(row.tvdb, [{season: row.season, episode: row.episode}]);
		});
		*/
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
		var http = require('http');
		var showCollection = db.collection('show');
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			trakt.show.summary(show.tvdb, function(error, json){
				if (json.images.banner){
					var banner = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/banner.jpg');
					banner.on('error', function(e){
						console.error(e);
					});
					var request = http.get(json.images.banner, function(response){
						response.pipe(banner);
					});
				}
				if (json.images.poster) {
					var src = json.images.poster.replace('.jpg', '-138.jpg');
					var poster = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory + '/poster.jpg');
					poster.on('error', function(e){
						console.error(e);
					});
					var request = http.get(src, function(response){
						response.pipe(poster);
					});
				}
				if (typeof(callback) == 'function') callback(null, show.tvdb);
			});
		});
	},
	
	getEpisode: function(tvdb, season, episode, callback){
		trakt.show.episode.summary(tvdb, season, episode, function(error, episode){
			episode.tvdb = tvdb;
			self.setEpisode(episode, function(error, response){
				if (typeof(callback) == 'function') callback(null, true);
			});
		});
	},
	
	getFullListings: function(tvdb, callback){
		var self = this;
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
		// Get all the hashes we can find, and add them to the database
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		showCollection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show || !show.feed) return;
			
			if (show.feed.indexOf('tvshowsapp.com') > 0 && show.feed.indexOf('.full.xml') == -1) {
				// If it's a TVShowsApp feed, get the .full.xml instead
				show.feed.replace(/\.xml$/, '.full.xml');
			}
			
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
					if (error) console.error('derp', error);
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
		request.get('http://tvshowsapp.com/showlist/showlist.xml', function(error, req, xml){
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					if (error) return;
					json.shows.show.forEach(function(show){
						var record = {
							name: show.name[0],
							tvdb: parseInt(show.tvdbid[0], 10),
							feed: show.mirrors[0].mirror[0]
						};
						// We could do an upsert, but it would overwrite the name and feed every time
						showCollection.count({tvdb: record.tvdb}, function(error, count){
							if (error || count == 1) return;
							showCollection.insert(record, function(error, affected){
								self.getSummary(record.tvdb);
							});
						});
					});
				});
			} catch(e) {
				console.error('showdata.getShowlist', e.message);
			}
		});
	},
	
	getSummary: function(tvdb, callback){
		var showCollection = db.collection('show');
		trakt.show.summary(tvdb, function(error, json){
			var record = {
				name: json.title,
				imdb: json.imdb_id,
				synopsis: json.overview
			};
			if (json.status == 'Ended') {
				record.ended = true;
				record.status = false;
			}
			showCollection.update({tvdb: tvdb}, {$set: record}, function(error, affected){
				if (typeof(callback) == 'function') callback(error, tvdb);
			});
		});
	},
	
	getUnmatched: function(callback){
		var unmatchedCollection = db.collection('unmatched');
		unmatchedCollection.find().toArray(callback);
	},
	
	/******************************************************/
	
	deleteEpisode: function(tvdb, season, episodes){
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