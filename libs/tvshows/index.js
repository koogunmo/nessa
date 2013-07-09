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
						db.get("SELECT * FROM show WHERE tvdb = ?", record.tvdb, function(error, row){
							if (error || typeof(row) != 'undefined') return;
							db.run("INSERT INTO show (tvdb, name, feed) VALUES (?,?,?)", record.tvdb, record.name, record.feed);
						});
					});
				});
			} catch(e) {
				console.error(e.message);
			}
		});
	},
	
	tvdb: function(){
		db.each("SELECT * FROM show WHERE tvdb IS NOT NULL", function(error, show){
			tvdb.getInfo('', show.tvdb, function(){
				// Update title to match TVDB
			});
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
	
	getLatest: function() {
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
						
						
						results.forEach(function(result){
							if (result.hd) return;	// Ignore HD (mkv) files for now
							
							db.get("SELECT * FROM show_episode WHERE show_id = ? AND season = ? AND episode = ?", show.id, result.season, result.episode, function(error, row){
								if (error || typeof(row) == 'undefined') return;
								
								
								
								if (!row.file || row.hash) return;
								
								// add to download queue
								
							//	bt.add('show', row.id, item.link);
								
							});
						});
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		});
	},
	
	show: function(id, full) {
		db.serialize(function(){
			db.get("SELECT * FROM show_new WHERE id = ?", function(error, row) {
				
			});
		});
		
		//	http://tvshowsapp.com/feeds/Californication.full.xml
		
	}
}