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
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			if (!row) return;
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
				if (error) {
					logger.error(error);
					return;
				}
				trakt.show.library(row.tvdb);
				ShowData.info(row.id);
				if (typeof(callback) == 'function') callback();
			});
		});
	},
	
	artwork: function(showid) {
		var easyimg = require('easyimage');
		
		if (typeof(showid) == 'number') {
			var sql = "SELECT * FROM show WHERE id = "+showid+" AND directory IS NOT NULL AND tvdb IS NOT NULL ORDER BY name ASC";
		} else {
			var sql = "SELECT * FROM show WHERE directory IS NOT NULL AND tvdb IS NOT NULL ORDER BY name ASC";
		}
		
		// TO DO - get artwork from trakt
		
		// Show
		// http://slurm.trakt.us/images/posters/198.jpg
		// 198 is the show ID
		
		// Episode
		// http://trakt.us/images/episodes/198-1-1.jpg
		// -1-1 = season, episode
		
		// Create artwork directory
		if (!fs.existsSync(process.cwd() + '/app/assets/artwork/')) mkdir(process.cwd() + '/app/assets/artwork', 0775);
		
		db.each(sql, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			logger.info(show.name+': Fetching artwork');
			request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/en.xml', function(error, req, xml){
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
						var data = json.Data.Series[0];
						if (data.banner && !fs.existsSync(process.cwd() + '/app/assets/artwork/'+show.tvdb+'.jpg')) {
							// Banner Artwork
							http.get('http://www.thetvdb.com/banners/'+data.banner[0], function(res){
								var imagedata = '';
								res.setEncoding('binary')
								res.on('data', function(chunk){
									imagedata += chunk
								});
								res.on('end', function(){
									var file = process.cwd() + '/app/assets/artwork/'+show.tvdb+'.jpg';
									fs.writeFile(file, imagedata, 'binary', function(error){
										if (error) {
											logger.error(error);
											return;
										}
										// Compress image
										exec('jpegoptim --strip-all -m80 '+file, function(error){});
									});
								});
							});
						}
						
						if (data.poster) {
							// Poster/DVD Image
							http.get('http://www.thetvdb.com/banners/'+data.poster[0], function(res){
								var imagedata = '';
								res.setEncoding('binary')
								res.on('data', function(chunk){
									imagedata += chunk
								});
								res.on('end', function(){
									var file = nconf.get('shows:base')+'/'+show.directory+'/cover.jpg';
									fs.writeFile(file, imagedata, 'binary', function(error){
										if (error) {
											logger.error(error);
											return;										
										}
										easyimg.resize({
											src: file,
											dst: file,
											height: 300,
											width: 204
										}, function(error, image){
											if (error) logger.error(error);
											exec('jpegoptim --strip-all -m80 '+file, function(error){});
										});
									});
								});
							});
						}
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		});
	},
	
	disable: function(id, callback){
		db.run("UPDATE show SET status = 0 WHERE id = ?", id, function(error){
			if (error) {
				logger.error(error);
				return;
			}
		});	
	},
	
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
	},
	
	available: function(callback){
		db.all("SELECT * FROM show WHERE directory IS NULL ORDER BY name ASC", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			if (rows === undefined) return;
			if (typeof(callback) == 'function') callback(rows);
		});
	},
	
	enabled: function(callback){
		db.all("SELECT * FROM show WHERE directory IS NOT NULL ORDER BY name ASC", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			if (rows === undefined) return;
			if (typeof(callback) == 'function') callback(rows);
		});
	},

	episodes: function(id, rescan){
		
		var rescan = (rescan !== undefined) ? !!rescan : true;
		
		if (id !== undefined) {
			var sql = "SELECT * FROM show WHERE id = "+id+" AND directory IS NOT NULL AND tvdb IS NOT NULL";
		} else {
			var sql = "SELECT * FROM show WHERE directory IS NOT NULL AND tvdb IS NOT NULL";
		}
		db.each(sql, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			logger.info(show.name + ': Fetching episode data');
			try {
				// Get episode listings from TVDB
				request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/all/en.xml', function(error, req, xml){
					if (error) {
						logger.error(error);
						return;
					}
					parser.parseString(xml, function(error, json){
						if (error) {
							logger.error(error);
							return;
						}
						if (!json.Data.Episode) return;
						json.Data.Episode.forEach(function(ep){
							var record = {
								id: show.id,
								season: ep.SeasonNumber[0],
								episode: ep.EpisodeNumber[0],
								title: ep.EpisodeName[0],
								synopsis: ep.Overview[0],
								airdate: ep.FirstAired[0]
							};
							// Ignore specials for now
							if (record.season == 0) return;
							var search = [record.id, record.season, record.episode];
							db.get("SELECT COUNT(id) AS count, id FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", search, function(error, result){
								if (error) {
									logger.error(error);
									return;
								}
								if (result.count == 1) {
									var params = [record.title, record.synopsis, record.airdate, result.id];
									db.run("UPDATE show_episode SET title = ?, synopsis = ?, airdate = ? WHERE id = ?", params, function(error){
										if (error) logger.error(error);
									});
								} else {
									var params = [record.id, record.season, record.episode, record.title, record.synopsis, record.airdate]
									db.run("INSERT INTO show_episode (show_id,season,episode,title,synopsis,airdate) VALUES (?,?,?,?,?,?)", params, function(error){
										if (error) logger.error(error);
									});
								}
							});
						});
					});
					events.emit('shows.episodes', null, show.id, rescan);
				});
			} catch(e) {
				logger.error(e.message);
			}
		});
	},
		
	info: function(showid, rescan){
		var rescan = (rescan !== undefined) ? !!rescan : true;
		
		if (showid) {
			var sql = "SELECT * FROM show WHERE id = "+showid+" AND tvdb IS NOT NULL ORDER BY name ASC";
		} else {
			var sql = "SELECT * FROM show WHERE tvdb IS NOT NULL ORDER BY name ASC";
		}
		// Enhance each show record with additional TVDB data
		db.each(sql, function(error, show){
			if (error) {
				console.error(error);
				return;
			}
			if (!show) return;
			logger.info(show.name + ': Fetching show data');
			request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/en.xml', function(error, req, xml){
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
						var data = json.Data.Series[0];
						var record = {
							id: show.tvdb,
							name: data.SeriesName[0],
							synopsis: data.Overview[0],
							imdb: data.IMDB_ID[0],
							ended: (data.Status[0] == 'Ended') ? 1 : 0
						};
						db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ?, ended = ? WHERE tvdb = ?", record.name, record.synopsis, record.imdb, record.ended, record.id);
						events.emit('shows.info', null, show.id, rescan);
					});
				} catch(e) {
					logger.error('shows.info', e.message);
				}
			});
			db.each("SELECT DISTINCT(E.season) FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE S.tvdb = ?", show.tvdb, function(error, row){
				trakt.show.season.info(show.tvdb, row.season, function(json){
					json.forEach(function(episode){
						var watched = (episode.watched) ? 1 : 0;
						var record = [watched, show.id, episode.season, episode.episode];
						db.run("UPDATE show_episode SET watched = ? WHERE show_id = ? AND season = ? AND episode = ?", record)
					});
				});
			});
		});
	},

	list: function(rescan){
		logger.info('Fetching show masterlist.');
		
		var rescan = (rescan !== undefined) ? !!rescan : false;
		
		// Get the latest showlist feed 
		request.get('http://tvshowsapp.com/showlist/showlist.xml', function(error, req, xml){
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
					json.shows.show.forEach(function(show){
						var record = {
							name: show.name[0],
							tvdb: show.tvdbid[0],
							feed: show.mirrors[0].mirror[0]
						};
						db.get("SELECT COUNT(id), id AS count FROM show WHERE tvdb = ?", record.tvdb, function(error, row){
							if (error) {
								logger.error(error);
								return;
							}
							if (row.count) {
							//	events.emit('shows.list', null, row.id);
							} else {
								db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed, function(error){
									if (error) {
										logger.error(error);
										return;
									}
							//		events.emit('shows.list', null, this.lastID);
								});
							}
						});
					});
				});
				events.emit('shows.list', null, rescan);
			} catch(e) {
				console.error('shows.list', e.message);
			}
		});
	},

	match: function(id, tvdb){
		if (id !== undefined) {
			var sql = "SELECT * FROM show_unmatched WHERE id = "+id;
		} else {
			var sql = "SELECT * FROM show_unmatched";
			tvdb	= null;
		}
		db.each(sql, function(error, row){
			// Search TVDB (we already have a method to match shows WITH a TVDB id)
			request.get('http://thetvdb.com/api/GetSeries.php?seriesname='+row.directory, function(error, req, xml){
				parser.parseString(xml, function(error, json){
					if (error) {
						logger.error(error);
						return;
					}
					if (!json.Data.Series) return;
					var results = json.Data.Series;
					
					if (tvdb !== undefined) {
						var found = [];
						results.forEach(function(result){
							if (result.id[0] == tvdb) found.push(result);
						});
						if (found.length) results = found;
					}
					
					if (results.length == 1) {
						var data = results[0];
						var record = {
							id: data.id[0],
							name: data.SeriesName[0],
							synopsis: data.Overview[0],
							imdb: data.IMDB_ID[0]
						};
						// Update shows table
						db.get("SELECT COUNT(id), id FROM show WHERE tvdb = ?", record.id, function(error, result){
							if (error) {
								logger.error(error);
								return;
							}
							if (result.count == 1) {
								var params = [record.name, row.directory, record.imdb, record.synopsis, result.id];
								db.run("UPDATE show SET name = ?, status = 1, directory = ?, imdb = ?, synopsis = ? WHERE id = ?", params, function(error){
									events.emit('scanner.shows', null, result.id, false);
								});
							} else {
								var params = [record.id, record.imdb, record.name, row.directory, record.synopsis];
								db.run("INSERT INTO show (tvdb,imdb,status,name,directory,synopsis) VALUES (?,?,1,?,?,?)", params, function(error, result){
									if (error) {
										logger.error(error);
										return;
									}
									events.emit('scanner.shows', null, this.lastID, false);
								});
							}
							db.run("DELETE FROM show_unmatched WHERE id = ?", row.id);
						});
					} else {
						// multiple results. hmmm...
						results.forEach(function(result){
							if (result.SeriesName[0].indexOf(row.directory) == 0) {
								console.log(result.SeriesName[0]);
							}
						});
					}
				});
			});
		})
	},
	
	overview: function(id, callback){
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			if (!show) return;
			
			var response = {
				general: show,
				seasons: []
			}
			
			response.general.directory = nconf.get('shows:base')+'/'+show.directory;
			
			db.all("SELECT * FROM show_episode WHERE show_id = ? ORDER BY season,episode ASC", show.id, function(error, rows){
				if (error) {
					logger.error(error);
					return;
				}
				var seasons = [];
				var episodes = [];
				
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
					response.seasons.push(record);
				});
				if (typeof(callback) == 'function') callback(response);
			});
		});
	},
	
	search: function(query, callback){
		var query = '%'+query+'%';
		db.all("SELECT * FROM show WHERE name LIKE ? AND directory IS NULL ORDER BY name ASC", query, function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			if (typeof(callback) == 'function') callback(rows);
		});
	},
	
	settings: function(data, callback){
		var err = null;
		
		if (!data.id) return;
		db.get("SELECT * FROM show WHERE id = ?", data.id, function(error, row){
			if (error) {
				err = error;
			} else {
				if (row === undefined) return;
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
					if (error) {
						logger.error(error);
						if (typeof(callback) == 'function') callback(null);
					}
				});
			}
			if (typeof(callback) == 'function') callback(err);
		});
	},
	
	unmatched: function(callback){
		db.all("SELECT id, directory FROM show_unmatched ORDER BY directory", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			var response = {
				shows: []
			};
			if (rows) {
				var parser	= new(require('xml2js')).Parser();
				var count	= 0;
				rows.forEach(function(row){
					request.get('http://thetvdb.com/api/GetSeries.php?seriesname='+row.directory, function(error, req, xml){
						parser.parseString(xml, function(error, json){
							if (error) {
								logger.error(error);
								return;
							}
							try {
								if (!json.Data.Series) return;
								if (json.Data.Series.length >= 1) {
									var results = [];
									json.Data.Series.forEach(function(data){
										if (!data) return;
										var record = {
											id: data.id[0],
											name: data.SeriesName[0],
											year: (data.FirstAired) ? data.FirstAired[0].substring(0,4) : null,
											synopsis: (data.Overview) ? data.Overview[0] : null,
											imdb: (data.IMDB_ID) ? data.IMDB_ID[0] : null
										};
										if (!record.year || !record.year) return;
										results.push(record);
									});
									row.matches = results;
									response.shows.push(row);
								}
							} catch(e) {
								logger.error(e);
							}
						});
						count++;
						if (rows.length == count) {
							if (typeof(callback) == 'function') callback(response);
						}
					});
				});
			}
		});
	},
	
	watched: function(id, season, episode){
		// mark an episode as watched
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
	
	/********************************/
	
	getName: function(){
		// ???
	},
	
	getLatest: function(){
		// Check the feeds for new episodes
		db.each("SELECT * FROM show WHERE status = 1 AND ended = 0 AND feed IS NOT NULL", function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			
			request.get(show.feed, function(error, req, xml){
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
								if (error) {
									logger.error(error);
									return;
								}
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
									// Update the episode listings
									events.emit('shows.info', null, show.id, false);
								}
							});
						});
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		});
	}
};
exports = module.exports = ShowData;