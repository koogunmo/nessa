var exec	= require('child_process').exec,
	feed	= require('feedparser'),
	fs		= require('fs'),
	http	= require('http'),
	mkdir	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	util	= require('util');

var ShowData = {
	
	add: function(id, callback){
		var self = this;
		
		// 'Add' a show to the database (actually just flags it as enabled, and creates the media directory)
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, row){
			if (error || !row) return;
			
			var update = {
				status: 1,
				directory: null
			};
			
			if (!row.directory) {
				try {
					mkdir(nconf.get('shows:base') + '/' + row.name, 0775);
					update.directory = row.name;
				} catch(e) {
					logger.error(e.message);
				}
			} else {
				update.directory = row.directory;
			}
			
			db.run("UPDATE show SET status = ?, directory = ? WHERE id = ?", update.status, update.directory, row.id, function(error){
				if (error) return;
				trakt.show.library(row.tvdb);
				if (typeof(callback) == 'function') callback(null, row.id);
			});
		});
	},
	
	download: function(id, callback){
		var self = this;
		// Download a specific episode from the RSS feed
		
		
		
		if (typeof(callback) == 'function') callback(null, true);
	},
	
	episodes: function(id, callback){
		var self = this;
		// return an array of episodes, grouped by season
		db.all("SELECT * FROM show_episode WHERE show_id = ? ORDER BY season,episode ASC", id, function(error, rows){
			if (error) return;
			var episodes = [];
			var response = []
			var seasons = [];
			rows.forEach(function(row){
				if (seasons.indexOf(row.season) == -1) seasons.push(row.season);
				if (!episodes[row.season]) episodes[row.season] = [];
				episodes[row.season].push(row);
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
	
	list: function(callback){
		var self = this;
		// Get a list of all enabled shows
		db.all("SELECT * FROM show WHERE status != -1 AND directory IS NOT NULL ORDER BY name ASC", function(error, rows){
			if (error) return;
			
		//	if (rows === undefined) error = 'No shows found';
			if (typeof(callback) == 'function') callback(null, rows);
		});
	},
	
	remove: function(id, callback){
		var self = this;
		// Remove a show
		db.run("UPDATE show SET status = -1 WHERE id = ?", id, function(error){
			if (error) error = 'Unable to remove show';
			if (typeof(callback) == 'function') callback(error, true);
		});
	},
	
	search: function(query, callback){
		var self = this;
		// Search database for any shows matching 'query' that aren't already enabled
		var query = '%'+query+'%';
		db.all("SELECT * FROM show WHERE name LIKE ? AND status <= 0 ORDER BY name ASC", query, function(error, rows){
			if (error) return;
			if (typeof(callback) == 'function') callback(null, rows);
		});
	},
	
	settings: function(data, callback){
		var self = this;
		// Update individual show settings
		db.get("SELECT * FROM show WHERE id = ?", data.id, function(error, row){
			if (error || row === undefined) return;
			var update = {
				feed: row.feed,
				hd: row.hd,
				status: row.status
			};
			for (var k in data) {
				if (!data[k]) continue;
				update[k] = data[k];
			}
			db.run("UPDATE show SET status = ?, hd = ?, feed = ? WHERE id = ?", update.status, update.hd, update.feed, data.id, function(error){
				if (error) return;
				if (typeof(callback) == 'function') callback(null, false);
			});
		});
	},
	
	summary: function(id, callback){
		var self = this;
		// Get show summary
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			if (error || !show) return;
			self.episodes(show.id, function(error, episodes){
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
		db.all("SELECT id, directory FROM show_unmatched ORDER BY directory", function(error, rows){
			if (error || !rows) return;
			
			rows.forEach(function(show){
				trakt.search('shows', show.directory, function(error, json){
					var result = {
						id: show.id,
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
		matches.forEach(function(match){
			db.get("SELECT id, directory FROM show_unmatched WHERE id = ?", match.id, function(error, row){
				if (error || !row) return;
				db.get("SELECT * FROM show WHERE tvdb = ?", match.tvdb, function(error, show){
					if (error || !show) return;
					if (show === undefined) {
						trakt.show.summary(match.tvdb, function(error, json){
							var record = [row.directory, match.tvdb, json.title];
							db.run("INSERT INTO show (status,directory,tvdb,name) VALUES (1,?,?,?)", record, function(error){
								if (error) return;
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
		});
	},
	
	watched: function(id, season, episode){
		// Mark an episode as watched
		db.get("SELECT S.tvdb, E.id FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE S.id = ? AND E.season = ? AND E.episode = ?", id, season, episode, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			if (row === undefined) return;
			db.run("UPDATE show_episode SET watched = 1 WHERE id = ?", row.id);
			trakt.show.episode.seen(row.tvdb, [{season: row.season, episode: row.episode}]);
		});
	},
	
	/******************************************************/
	
	getArtwork: function(id, callback){
		var self = this;
		var http = require('http');
		
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			// get poster and banner art from trakt
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
				if (typeof(callback) == 'function') callback(null, show.id);
			});
		});
	},
	
	getEpisode: function(id, season, episode, callback){
		var self = this;
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			trakt.show.episode.summary(show.tvdb, season, episode, function(error, episode){
				episode.show_id = show.id;
				self.setEpisode(episode, function(error, response){
					if (typeof(callback) == 'function') callback(null, true);
				});
			});
		});
	},
	
	getFullListings: function(id, callback){
		var self = this;
		// Fetch episode listings
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			if (error) return;
			trakt.show.seasons(show.tvdb, function(error, seasons){
				var count = 0;
				var total = seasons.length;
				seasons.forEach(function(season){
					trakt.show.season.info(show.tvdb, season.season, function(error, episodes){
						count++;
						episodes.forEach(function(episode){
							episode.show_id = show.id;
							self.setEpisode(episode);
						});
						if (count == total) {
							if (typeof(callback) == 'function') callback(null, show.id);
						}
					});
				});
			});
		});
	},
	
	getLatest: function(){
		var self = this;
		// Check each of the feeds for new episodes
		db.each("SELECT * FROM show WHERE status = 1 AND ended = 0 AND feed IS NOT NULL", function(error, show){
			if (error) return;
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
							db.all("SELECT * FROM show_episode WHERE show_id = ? AND season = ? AND episode IN ("+result.episode.join(',')+")", show.id, result.season, function(error, rows){
								if (error) return;
								if (typeof(rows) == 'undefined') return;
								
								var ids = [];
								rows.forEach(function(row){
									if (row.hash || row.file) return;
									ids.push(row.id);
								});
								if (ids.length) {
									/* Add to Transmission */
									torrent.add({
										id: ids,
										magnet: result.magnet
									});
									self.getFullListings(show.id);
								}
							});
						});
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		});
	},
	
	getShowlist: function(callback){
		self = this;
		// Get the latest showlist feed from TVShows and add new entries into the local database
		request.get('http://tvshowsapp.com/showlist/showlist.xml', function(error, req, xml){
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					if (error) return;
					json.shows.show.forEach(function(show){
						var record = {
							name: show.name[0],
							tvdb: show.tvdbid[0],
							feed: show.mirrors[0].mirror[0]
						};
						db.get("SELECT COUNT(id), id AS count FROM show WHERE tvdb = ?", record.tvdb, function(error, row){
							if (error) return;
							if (row.count == 0) {
								db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed, function(error){
									if (error) return;
									self.getSummary(this.lastID);
								});
							}
						});
					});
				});
			} catch(e) {
				console.error('shows.list', e.message);
			}
		});
	},
	
	getSummary: function(id, callback){
		// Update the show information from trakt
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			trakt.show.summary(show.tvdb, function(error, json){
				var ended = (json.status == 'Ended') ? true : false;
				db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ?, ended = ? WHERE tvdb = ?", json.title, json.overview, json.imdb_id, ended, show.tvdb, function(error){
					if (error) return;
				});
				if (typeof(callback) == 'function') callback(null, show.id);
			});
		});
	},
	
	/******************************************************/
	
	setEpisode: function(episode, callback) {
		db.get("SELECT COUNT(id) AS count FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", episode.show_id, episode.season, episode.episode, function(error, row){
			if (error) console.log(error);
			
			if (!row.count){
				var record = [
					episode.show_id, episode.season, episode.episode, episode.title, episode.overview, episode.first_aired, episode.watched
				];
				db.run("INSERT INTO show_episode (show_id,season,episode,title,synopsis,airdate,watched) VALUES (?,?,?,?,?,?,?)", record, function(error){
					if (error) return;
				});
			} else {
				var record = [
					episode.title, episode.overview, episode.first_aired, episode.watched, episode.show_id, episode.season, episode.episode
				];
				db.run("UPDATE show_episode SET title = ?, synopsis = ?, airdate = ?, watched = ? WHERE show_id = ? AND season = ? AND episode = ?", record, function(error){
					if (error) return;
				});
			}
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