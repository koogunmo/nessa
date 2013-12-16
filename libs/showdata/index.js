var exec	= require('child_process').exec,
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
		var collection = dbm.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, result){
			var record = {
				status: 1
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
		var collection = dbm.collection('episode');
		dbm.find({tvdb: tvdb}).toArray(function(error, results){
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
		/*
		db.all("SELECT S.id, S.tvdb, S.name, E.season, E.episode, E.title, E.synopsis, E.airdate, E.watched FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE file IS NOT NULL AND airdate >= ? ORDER BY airdate DESC, episode DESC LIMIT 10", lastweek, function(error, rows){
			if (error) return;
			if (typeof(callback) == 'function') callback(null, rows);
		});
		*/
		
		var collection = dbm.collection('episode');
		collection.find({
			file: {$exists: true, $ne: null},
			airdate: {$ge: lastweek}
		}).toArray(function(error, results){
			
			
		});
	},
	
	list: function(callback){
		var self = this;
		var collection = dbm.collection('show');
		collection.find({status: {$exists: true, $ge: 0}}).toArray(callback);
	},
	
	remove: function(tvdb, callback){
		var collection = dbm.collection('show');
		collection.update({tvdb: data.tvdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	search: function(query, callback){
		var self = this;
		// Search database for any shows matching 'query' that aren't already enabled
		var query = '/.*'+query+'%';
	//	db.all("SELECT * FROM show WHERE name LIKE ? AND status <= 0 ORDER BY name ASC", query, function(error, rows){
	//		if (error) return;
	//		if (typeof(callback) == 'function') callback(null, rows);
	//	});
		
		
	//	var collection = dbm.collection('show');
	//	collection.find({name: /.*.*/}).toArray(callback);
		
	},
	
	settings: function(data, callback){
		var collection = dbm.collection('show');
		collection.update({tvdb: data.tvdb}, {$set: data}, {upsert: true}, function(error, affected){
			
			if (typeof(callback) == 'function') callback(error, !!affected);
		});
	},
	
	summary: function(tvdb, callback){
		var self = this;
		
		var collection = dbm.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, show){
			self.episodes(show.tvdb, function(error, episodes){
				var response = {
					summary: show,
					listing: episodes
				};
				response.summary.path = nconf.get('shows:base')+'/'+show.directory;
				
				if (typeof(callback) == 'function') callback(null, response);
			});
		});
	},
	
	unmatched: function(callback){
		var collection = dbm.collection('unmatched');
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
		
		var showsCollection = dbm.collection('show');
		var unmatchedCollection = dbm.collection('unmatched');
		
		var ObjectID = require('mongodb').ObjectID;
		
		matches.forEach(function(match){
			unmatchedCollection.findOne({_id: ObjectID(match.id)}, function(error, row){
				
				console.log(error, row);
				
				
			});
			
			
			
			
			/*
			db.get("SELECT id, directory FROM show_unmatched WHERE id = ?", match.id, function(error, row){
				if (error || !row) return;
				db.get("SELECT * FROM show WHERE tvdb = ?", match.tvdb, function(error, show){
					if (error) return;
					if (show === undefined) {
						trakt.show.summary(match.tvdb, function(error, json){
							var record = [row.directory, match.tvdb, json.title];
							db.run("INSERT INTO show (status,directory,tvdb,name) VALUES (1,?,?,?)", record, function(error){
								if (error) {
									console.log(error);
									return;
								}
								db.run("DELETE FROM show_unmatched WHERE id = ?", row.id, function(error){
									if (error) return;
								});
								if (typeof(callback) == 'function') callback(null, this.lastID);
							});
						});
					} else {
						db.run("UPDATE show SET directory = ?, status = 1 WHERE id = ?", row.directory, show.id, function(error){
							if (error) return;
							db.run("DELETE FROM show_unmatched WHERE id = ?", row.id, function(error){
								if (error) return;
							});
							if (typeof(callback) == 'function') callback(null, show.id);
						});
					}
				});
			});
			*/
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
		var collection = dbm.collection('episode');
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
		
		var collection = dbm.collection('show');
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
			episode.tvdb = episode.tvdb_id;
			self.setEpisode(episode, function(error, response){
				if (typeof(callback) == 'function') callback(null, true);
			});
		});
	},
	
	getFullListings: function(tvdb, callback){
		var self = this;
		// Fetch episode listings
		var collection = dbm.collection('show');
		collection.findOne({tvdb: tvdb}, function(error, show){
			if (error || !show) return;
			trakt.show.seasons(show.tvdb, function(error, seasons){
				var count = 0;
				var total = seasons.length;
				seasons.forEach(function(season){
					trakt.show.season.info(show.tvdb, season.season, function(error, episodes){
						count++;
						episodes.forEach(function(episode){
							episode.tvdb = show.tvdb_id;
							self.setEpisode(episode);
						});
						if (count == total) {
							if (typeof(callback) == 'function') callback(null, show.tvdb);
						}
					});
				});
			});
		});
	},
	
	getLatest: function(){
		var self = this;
		// Check each of the feeds for new episodes
		var collection = dbm.collection('show');
		
		collection.find({
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
								/*
								db.all("SELECT S.name, E.* FROM show_episode AS E INNER JOIN show AS S ON E.show_id = S.id WHERE E.show_id = ? AND E.season = ? AND E.episode IN ("+result.episode.join(',')+")", show.id, result.season, function(error, rows){
									if (error) return;
									if (typeof(rows) == 'undefined') return;
									
									var ids = [];
									rows.forEach(function(row){
										if (row.hash || row.file) return;
										ids.push(row.id);
									});
									if (ids.length) {
										torrent.add({
											id: ids,
											magnet: result.magnet
										});
										self.getFullListings(show.id);
									}
								});
								*/
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
				var collection = dbm.collection('show');
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
			if (json.status == 'Ended') record.ended = true;
			var collection = dbm.collection('show');
			collection.update({tvdb: tvdb}, {$set: record}, {upsert: true}, function(error, affected){
				if (typeof(callback) == 'function') callback(error, tvdb);
			});
		});
	},
	
	getUnmatched: function(callback){
		var collection = dbm.collection('unmatched');
		collection.find().toArray(callback);
	},
	
	/******************************************************/
	
	setEpisode: function(episode, callback) {
		var record = {
			tvdb: episode.tvdb_id,
			season: episode.season,
			episode: episode.episode,
			title: episode.title,
			synopsis: episode.overview,
			airdate: episode.first_aired,
			watched: episode.watched
		};
		var collection = dbm.collection('episode');
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