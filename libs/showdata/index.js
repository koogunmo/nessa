var feed	= require('feedparser'),
	fs		= require('fs'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	tvrage	= plugin('tvrage'),
	util = require('util');

var ShowData = {
	
	list: function(callback){
		logger.info('Fetching show masterlist');
		// Get the latest showlist feed 
		request.get('http://tvshowsapp.com/showlist/showlist.xml', function(error, req, xml){
			if (error) {
				logger.error(error);
				return;
			}
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
							if (error || row.count >= 1) {
							//	events.emit('shows.list', null, row.id);
								return;
							} else {
								db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed, function(error, resp){
									console.log('data:list', error, resp);
								});
							}
						});
					});
				});
				events.emit('shows.list', null, null);
			} catch(e) {
				console.error(e.message);
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
							year: data.FirstAired[0].substring(0,4),
							tvrage: null
						};
						
						tvrage.search(record.name, function(results){
							if (results.length > 1) {
								var list = []
								var found = false;
								
								// TO DO: Improve filtering (use airdates, etc)
								
								results.forEach(function(result){
									if (found) return;
									
									if (result.name.indexOf(show.name) == 0)  {
										list.push(result);
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
					logger.error(e.message);
				}
			});
		});
	},

	episodes: function(showid){
		db.each("SELECT * FROM show WHERE id = ? AND status = 1 AND tvrage IS NOT NULL", showid, function(error, show){
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
						if (error) return;
						var results = [];
						
						if (!json.rss.channel[0].item) return;
						
						json.rss.channel[0].item.forEach(function(item){
							var res = helper.getEpisodeNumbers(item.title[0]);
							var record = {
								season: res.season,
								episode: res.episodes[0],
								hd: (item.title[0].match('720p')) ? true : false,
								magnet: item.guid[0]['_']	// need to tweak to add multiple trackers...
							};
							results.push(record);
						});
						
						if (!results) return;
						
						results.forEach(function(result){
							if (show.hd != result.hd) return;
							db.get("SELECT * FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", show.id, result.season, result.episode, function(error, row){
								if (error || typeof(row) == 'undefined' || row.file || row.hash) return;
								
							//	console.log('data:latest', show.name, row.title, result);
								
								/* Add to Transmission */
							//	torrent.add(row.id, result.magnet);
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