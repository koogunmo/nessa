var feed	= require('feedparser'),
	fs		= require('fs'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	tvrage	= plugin('tvrage'),
	util = require('util');


var ShowData = {
	list: function(callback){
		logger.info('Fetching show masterlist.');
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
				events.emit('shows.list', null, null);
			} catch(e) {
				console.error('shows.list', e.message);
			}
		});
	},
		
	info: function(showid){
		if (typeof(showid) == 'number') {
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
							year: parseInt(data.FirstAired[0].substring(0,4), 10),
							tvrage: null
						};
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
						var found = null;
						results.forEach(function(result){
							if (result.id[0] == tvdb) found.push(result);
						});
						if (found) results = found;
					}
					
					if (results.length == 1) {
						var data = results[0];
						var record = {
							id: data.id[0],
							name: data.SeriesName[0],
							synopsis: data.Overview[0],
							imdb: data.IMDB_ID[0],
						};
						// Add to main DB
						db.run("INSERT INTO show (tvdb,imdb,status,name,directory,synopsis) VALUES (?,?,1,?,?,?)", record.id, record.imdb, record.name, row.directory, record.synopsis, function(error, result){
							if (error) {
								logger.error(error);
								return;
							}
							events.emit('scanner.shows', true, this.lastid);
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
			var sql = "SELECT * FROM show WHERE id = '"+id+"' AND status = 1 AND tvrage IS NOT NULL";
		} else {
			var sql = "SELECT * FROM show WHERE status = 1 AND ended = 0 AND tvrage IS NOT NULL";
		}
		db.each(sql, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			logger.info(show.name + ': Fetching episode data');
			try {
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
			} catch(e) {
				logger.error(e.message);
			}
		});
	},
	
	
	getLatest: function() {
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