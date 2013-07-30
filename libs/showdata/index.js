var feed	= require('feedparser'),
	fs		= require('fs'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request'),
	tvrage	= plugin('tvrage'),
	util = require('util');

var ShowData = {
	
	list: function(callback){
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
						db.get("SELECT COUNT(id) AS count FROM show WHERE tvdb = ?", record.tvdb, function(error, row){
							if (error || row.count >= 1) return;
							db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed, function(error, resp){
								
							});
						});
					});
				});
			//	events.emit('shows.list');
			} catch(e) {
				console.error(e.message);
			}
		});
	},
	
	info: function(){
		// Enhance each show record with additional TVDB data
		db.each("SELECT * FROM show WHERE tvdb IS NOT NULL", function(error, show){
			if (error) {
				console.error(error);
				return;
			}
			request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/en.xml', function(error, req, xml){
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
							events.emit('shows.info', null, record.id);
						});
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		});
	},

	episodes: function(showid){
		db.get("SELECT * FROM show WHERE id = ? AND tvrage IS NOT NULL", showid, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
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
		});
	}
	
};
exports = module.exports = ShowData;