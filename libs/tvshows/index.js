// grab data from http://tvshowsapp.com

var feed	= require('feedparser'),
	fs		= require('fs'),
	parser	= new(require('xml2js')).Parser(),
	request	= require('request');


exports = module.exports = {
	
	list: function(callback){
		// Get the latest showlist feed 
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
						db.get("SELECT COUNT(id) AS count FROM show WHERE tvdb = ?", record.tvdb, function(error, row){
							if (error || row.count >= 1) return;
							db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed);
						});
					});
				});
				if (typeof(callback) == 'function') callback();
			} catch(e) {
				console.error(e.message);
			}
		});
	},
	
	info: function(){
		// Enhance each show record with additional TVDB data
		db.each("SELECT * FROM show WHERE status = 1 AND tvdb IS NOT NULL AND imdb IS NULL", function(error, show){
			if (error) console.error(error);
			request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/all/en.xml', function(error, req, xml){
				parser.parseString(xml, function(error, json){
					if (error) return;					
					var data = json.Data.Series[0];
					var record = {
						id: show.tvdb,
						name: data.SeriesName[0],
						synopsis: data.Overview[0],
						imdb: data.IMDB_ID[0]
					};
					db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ? WHERE tvdb = ?", record.name, record.synopsis, record.imdb, record.id);
				});
			});
		});
	},
	
	tvrage: function(){
		// Search TVRage for a matching show
		var tvrage = plugin('tvrage');
		
		db.each("SELECT * FROM show WHERE tvrage IS NULL", function(error, show){
			try {
				tvrage.search(show.name, function(results){
					// TODO: Improve matching
					if (results.length > 1) {
						var list = []
						for (var i=0;i<results.length;i++) {
							var result = results[i];
							if (result.name.indexOf(show.name) == 0) {
								list.push(result);
							}
						}
						results = list;
					}
					if (results.length == 1) {
						var result = results[0];
						db.run("UPDATE show SET tvrage = ? WHERE id = ?", result.name, result.id, show.id);
					} else {
						// We'll need user interaction for these ones
						logger.info('[TV RAGE] - %d result(s) found for: %s', results.length, show.name);
						results.forEach(function(result){
							logger.info(' - %s (%s)', result.name, result.started);
						});
					}
				});
			} catch(e) {
				logger.error(e.message);
			}
		});
	},
	
	ended: function() {
		// Which shows have ended
		request.get('http://tvshowsapp.com/showlist/endedshows.xml', function(error, req, xml){
			try {
				if (error) return;
				parser.parseString(xml, function(error, json){
					if (error) return;
					json.shows.show.forEach(function(show){
						db.run("UPDATE show SET ended = 1 WHERE name = ?", show);
					});
				});
			} catch(e) {
				logger.error(e.message);
			}
		});
	},
	
	getLatest: function(callback) {
		// Check the feeds for new episodes
		db.each("SELECT * FROM show WHERE status = 1 AND ended = 0 AND feed IS NOT NULL", function(error, show){
			if (error) return;
			request.get(show.feed, function(error, req, xml){
				if (error) return;
				try {
					parser.parseString(xml, function(error, json){
						if (error) return;
						var results = [];
						json.rss.channel[0].item.forEach(function(item){
							var res = helper.getEpisodeNumbers(item.title[0]);
							var record = {
								season: res.season,
								episode: res.episodes[0],
								hd: (item.title[0].match('720p')) ? true : false,
								torrent: item.link[0],
								magnet: item.guid[0]['_']
							};
							results.push(record);
						});
						
					//	console.log(results);
						
						results.forEach(function(result){
							if (show.hd != result.hd) return;
							db.get("SELECT * FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", show.id, result.season, result.episode, function(error, row){
								if (error || typeof(row) == 'undefined') return;
								if (!row.file || row.hash) return;
								
								
								
								/* Add to transmission */
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
}