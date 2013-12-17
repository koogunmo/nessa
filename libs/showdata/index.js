var exec	= require('child_process').exec,
	extend	= require('xtend'),
	feed	= require('feedparser'),
	fs		= require('fs'),
	http	= require('http'),
	mkdir	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	util	= require('util');

var ShowData = {
	
	add: function(tvdb, callback){
		var self = this;
		// 'Add' a show to the database (actually just flags it as enabled, and creates the media directory)
		var collection = db.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, result){
			var record = {
				status: true
			};
			if (!result.directory) {
				try {
					mkdir(nconf.get('shows:base') + '/' + row.name, 0775);
					update.directory = row.name;
				} catch(e) {
					logger.error(e.message);
				}
			}
			collection.update({tvdb: tvdb}, {$set: record}, {upsert: true}, function(error, affected){
				if (typeof(callback) == 'function') callback(null, tvdb);
			});
		});
	},
	
	download: function(id, callback){
		var self = this;
		// Download a specific episode from the RSS feed
		if (typeof(callback) == 'function') callback(null, true);
	},
	
	episodes: function(tvdb, callback){
		var collection = db.collection('episode');
		collection.find({tvdb: tvdb}).toArray(function(error, results){
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
	
	latest: function(callback){
		var self = this;
		var lastweek = Math.round(new Date()/1000) - (7*24*60*60);
		
		var episodeCollection = db.collection('episode');
		var showCollection = db.collection('show');
		
		var list = [];
		
		episodeCollection.find({
			file: {$exists: true},
			airdate: {$gt: lastweek-1, $lt: Math.round(new Date()/1000)}
		}).toArray(function(error, results){
			var count = 0;
			results.forEach(function(result){
				showCollection.findOne({tvdb: result.tvdb}, function(error, show){
					list.push({
						show: show,
						episode: result
					});
					count++;
				});
			});
			setTimeout(function(){
				if (count == results.length) {
					if (typeof(callback) == 'function') callback(null, list);
				}
			}, 100);
		});
	},
	
	list: function(callback){
		var collection = db.collection('show');
		collection.find({status: {$exists: true}}).toArray(callback);
	},
	
	remove: function(tvdb, callback){
		var collection = db.collection('show');
		collection.update({tvdb: tvdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	search: function(query, callback){
		var query = new RegExp(query, 'i');
		var collection = db.collection('show');
		collection.find({name: query, status: {$exists: false}}).toArray(callback);
	},
	
	settings: function(data, callback){
		var collection = db.collection('show');
		delete data._id;
		collection.update({tvdb: data.tvdb}, {$set: data}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	summary: function(tvdb, callback){
		var self = this;
		
		var collection = db.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, show){
			self.episodes(show.tvdb, function(error, episodes){
				var response = {
					summary: show,
					listing: episodes
				};
				response.displaypath = nconf.get('shows:base')+'/'+show.directory;
				
				if (typeof(callback) == 'function') callback(null, response);
			});
		});
	},
	
	unmatched: function(callback){
		var collection = db.collection('unmatched');
		collection.find({}).toArray(function(error, shows){
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
		
		var showCollection = db.collection('show');
		var unmatchedCollection = db.collection('unmatched');
		
		var ObjectID = require('mongodb').ObjectID;
		
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
		var collection = db.collection('episode');
		var record = {
			watched: true
		};
		collection.update({tvdb: tvdb, season: season, episode: episode}, {$set: record}, function(error, affected){
//			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	/******************************************************/
	
	getArtwork: function(tvdb, callback){
		var self = this;
		var http = require('http');
		
		var collection = db.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, show){
			trakt.show.summary(show.tvdb, function(error, json){
				if (json.images.banner){
					var banner = fs.createWriteStream(nconf.get('shows:base') + '/' + show.directory + '/banner.jpg');
					banner.on('error', function(e){
						console.error(e);
					});
					var request = http.get(json.images.banner, function(response){
						response.pipe(banner);
					});
				}
				if (json.images.poster) {
					var src = json.images.poster.replace('.jpg', '-138.jpg');
					var poster = fs.createWriteStream(nconf.get('shows:base') + '/' + show.directory + '/poster.jpg');
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
		var collection = db.collection('show');
		
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
	
	getLatest: function(){
		var self = this;
		// Check each of the feeds for new episodes
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		showCollection.find({
			status: 1,
			ended: {$exists: false},
			feed: {$exists: true, $ne: null}
		}).toArray(function(error, shows){
			if (error || !shows) return;
			shows.forEach(function(show){
				request.get(show.feed, function(error, req, xml){
					if (error) return;
					try {
						parser.parseString(xml, function(error, json){
							if (error) return;
							var results = [];
							if (!json.rss.channel[0].item) return;
							var now = new Date().getTime();
							var limit = 60*60*24*8*1000;
							
							json.rss.channel[0].item.forEach(function(item){
								var airdate = new Date(item.pubDate[0]).getTime();
								if (airdate < now-limit) return;
								
								var res = helper.getEpisodeNumbers(item.title[0]);
								
								var sources = [];
								if (item.enclosure) sources.push(item.enclosure[0]['$'].url);
								if (item.link) sources.push(item.link[0]);
								if (item.guid) sources.push(item.guid[0]['_']);
								
								var magnet = null;
								for (var i in sources) {
									var source = sources[i];
									if (source.indexOf('magnet:?') == 0) {
										magnet = source;
										break;
									}
								}
								var record = {
									season: res.season,
									episode: res.episodes,
									hd: (item.title[0].match(/720p|1080p/i)) ? true : false,
									magnet: magnet,
									aired: airdate
								};
								if (magnet) results.push(record);
							});
							
							if (!results) return;
							
							results.forEach(function(result){
								if (show.hd != result.hd) return;
								episodeCollection.find({
									tvdb: show.tvdb,
									season: result.season,
									episode: {$in: result.episode}
								}).toArray(function(error, rows){
									var list = [];
									rows.forEach(function(row){
										list.push(row._id);
									});
									if (list.length){
										torrent.add({
											id: list,
											magnet: result.magnet
										});
										self.getFullListings(show.tvdb);
									}
								});
							});
						});
					} catch(e) {
						logger.error('shows.getlatest', e.message);
					}
				});
			});
		});
	},
	
	getShowlist: function(callback){
		self = this;
		// Get the latest showlist feed from TVShows and add new entries into the local database
		request.get('http://tvshowsapp.com/showlist/showlist.xml', function(error, req, xml){
			if (error) return;
			try {
				var collection = db.collection('show');
				parser.parseString(xml, function(error, json){
					if (error) return;
					json.shows.show.forEach(function(show){
						var record = {
							name: show.name[0],
							tvdb: show.tvdbid[0],
							feed: show.mirrors[0].mirror[0]
						};
						collection.update({tvdb: record.tvdb}, {$set: record}, {upsert: true}, function(error, affected){
							self.getSummary(record.tvdb);
						});
					});
				});
			} catch(e) {
				console.error('shows.getShowlist', e.message);
			}
		});
	},
	
	getSummary: function(tvdb, callback){
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
			var collection = db.collection('show');
			collection.update({tvdb: tvdb}, {$set: record}, {upsert: true}, function(error, affected){
				if (typeof(callback) == 'function') callback(error, tvdb);
			});
		});
	},
	
	getUnmatched: function(callback){
		var collection = db.collection('unmatched');
		collection.find().toArray(callback);
	},
	
	/******************************************************/
	
	setEpisode: function(episode, callback) {
		var record = {
			tvdb: episode.tvdb,
			season: episode.season,
			episode: episode.episode,
			title: episode.title,
			synopsis: episode.overview,
			airdate: episode.first_aired,
			watched: episode.watched
		};
		var collection = db.collection('episode');
		collection.update({tvdb: record.tvdb, season: record.season, episode: record.episode}, {$set: record}, {upsert: true}, function(error, affected){
			if (typeof(callback) == 'function') callback(null, true)
		});
	}
	
	/******************************************************/
	
	/*
	download: function(epid){
		var sql = "SELECT E.id, S.name, S.feed, S.hd, E.season, E.episode, E.title FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE E.id = ?";
		db.get(sql, epid, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			
			
			if (row.feed.indexOf('tvshowsapp.com') >= 0) {
				row.feed = row.feed.replace(/.xml/, '.full.xml')
			}
			
			request.get(row.feed, function(error, req, xml){
				if (error) {
					logger.error(error);
					return;
				}
				try {
					parser.parseString(xml, function(error, json){
						if (error) {
							logger.error(error);
							return;
						}
						if (!json.rss.channel[0].item) return;
						json.rss.channel[0].item.forEach(function(item){
							var title = item.title.toString();
							if (!row.hd && title.match(/720p|1080p/i)) return;
							var data = helper.getEpisodeNumbers(title);
							if (data.season == row.season && data.episodes.indexOf(row.episode) >= 0) {
								var magnet = item.guid[0]['_'];
								torrent.add({
									id: [row.id],
									magnet: magnet
								});
							}
						});
					});
				} catch(e){
					logger.error(e.message);
				}
			});
		});
	}
	*/
};
exports = module.exports = ShowData;