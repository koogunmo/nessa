var feed	= require('feedparser'),
	fs		= require('fs'),
	http	= require('http'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
//	tvrage	= plugin('tvrage'),
	util = require('util');


var ShowData = {
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
	
	artwork: function(showid) {
		if (typeof(showid) == 'number') {
			var sql = "SELECT * FROM show WHERE id = "+showid+" AND directory IS NOT NULL AND tvdb IS NOT NULL ORDER BY name ASC";
		} else {
			var sql = "SELECT * FROM show WHERE directory IS NOT NULL AND tvdb IS NOT NULL ORDER BY name ASC";
		}
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
						if (data.banner && !fs.existsSync(process.cwd() + '/assets/artwork/'+show.tvdb+'.jpg')) {
							http.get('http://www.thetvdb.com/banners/'+data.banner[0], function(res){
								var imagedata = '';
								res.setEncoding('binary')
								res.on('data', function(chunk){
									imagedata += chunk
								});
								res.on('end', function(){
									fs.writeFile(process.cwd() + '/assets/artwork/'+show.tvdb+'.jpg', imagedata, 'binary', function(error){
										if (error) {
											logger.error(error);
											return;
										}
									});
								});
							});
						}
						if (data.poster) {
							http.get('http://www.thetvdb.com/banners/'+data.poster[0], function(res){
								var imagedata = '';
								res.setEncoding('binary')
								res.on('data', function(chunk){
									imagedata += chunk
								});
								res.on('end', function(){
									fs.writeFile(nconf.get('shows:base')+'/'+show.directory+'/cover.jpg', imagedata, 'binary', function(error){
										if (error) {
											logger.error(error);
											return;										
										}
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
		
	info: function(showid){
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
							// Deprecate TVRage?
						//	tvrage: null
						};
						db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ?, ended = ? WHERE tvdb = ?", record.name, record.synopsis, record.imdb, record.ended, record.id);
						/*
						// Get TVRage ID
						tvrage.search(record.name, function(results){
							if (results.length > 1) {
								var list = []
								var found = false;
								results.forEach(function(result){
									if (found) return;
									// Probably not the best matching method, but it works in all cases I've tried
									var year = parseInt(result.started.substring(result.started.length-4), 10);
									if (result.name.indexOf(show.name) == 0 && year == record.year)  {
										list.push(result);
										if (show.name == result.name) found = true;
									}
								});
								results = list;
							}
							if (results.length == 1) {
								var result = results[0];
								record.tvrage = result.id;
							}
							db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ?, tvrage = ? WHERE tvdb = ?", record.name, record.synopsis, record.imdb, record.tvrage, record.id);
						});
						*/
						events.emit('shows.info', null, show.id);
					});
				} catch(e) {
					logger.error('shows.info', e.message);
				}
			});
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
									events.emit('scanner.shows', true, result.id);
								});
							} else {
								var params = [record.id, record.imdb, record.name, row.directory, record.synopsis];
								db.run("INSERT INTO show (tvdb,imdb,status,name,directory,synopsis) VALUES (?,?,1,?,?,?)", params, function(error, result){
									if (error) {
										logger.error(error);
										return;
									}
									events.emit('scanner.shows', true, this.lastID);
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

	episodes: function(id){
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
					events.emit('shows.episodes', null, show.id);
				});
				/*
				tvrage.episodes(show.tvrage, function(data){
					data.season.forEach(function(season){
						season.episode.forEach(function(episode){
							var record = [
								episode.title,
								episode.airdate,
								show.id,
								episode.season,
								episode.episode
							];
							db.get("SELECT COUNT(id) AS count FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", record[2], record[3], record[4], function(error, result){
								if (error) {
									logger.error(error);
									return;
								}
								if (result.count == 1) {
									db.run("UPDATE show_episode SET title = ?, airdate = ? WHERE show_id = ? AND season = ? AND episode = ?", record);
								} else {
									db.run("INSERT INTO show_episode (title,airdate,show_id,season,episode) VALUES (?,?,?,?,?)", record);
								}
							});
						});
					});
					events.emit('shows.episodes', null, show.id);
				});
				*/
			} catch(e) {
				logger.error(e.message);
			}
		});
	},
	
	download: function(epid){
		var sql = "SELECT S.name, S.feed, S.hd, E.season, E.episode, E.title FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE E.id = ?";
		db.get(sql, epid, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			row.feed = row.feed.replace(/.xml/, '.full.xml');
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
							if (!row.hd && title.match('720p')) return;
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
	
	getName: function(){
	
	
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
							var record = {
								season: res.season,
								episode: res.episodes,
								hd: (item.title[0].match('720p')) ? true : false,
								magnet: item.guid[0]['_'],
								aired: airdate
							};
							results.push(record);
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