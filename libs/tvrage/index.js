var parser	= new (require('xml2js')).Parser();
var request	= require('request');

exports = module.exports = {
	
	search: function(q, callback) {
		// Search for a show, so we can grab its ID
		var url = 'http://services.tvrage.com/feeds/search.php?show=' + q;
		request.get(url, function(error, res, xml) {
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					var records	= [];
					var shows	= json.Results.show;
					shows.forEach(function(show){
						var row = {
							id: show.showid[0],
							name: show.name[0],
							link: show.link[0],
							country: show.country[0],
							seasons: show.seasons[0],
							started: show.started[0],
							ended: show.ended[0],
							status: show.status[0],
							classification: show.classification[0],
							genres: show.genres[0]
						};
						if (row.name.indexOf(q) == -1) return;
						records.push(row);
					});
					if (typeof(callback) == 'function') callback(records);
				});
			} catch(e) {
				console.error(e.mesage);
			}
		});
	},
	
	info: function(showid, callback) {
		var url = 'http://services.tvrage.com/feeds/showinfo.php?sid=' + showid;
		request.get(url, function(error, res, xml) {
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					var show = json.Showinfo;
					var result = {
						id: show.showid[0],
						name: show.showname[0]
					};
					if (typeof(callback) == 'function') callback(result);
				});
			} catch(e) {
				console.error(e.mesage);
			}
		});
	},
	
	episodes: function(showid, callback) {
		// Get info and episodes for a specific show
		var url = 'http://services.tvrage.com/feeds/episode_list.php?sid=' + showid;
		request.get(url, function(error, res, xml) {
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					var records = {
						show: {
							id: showid,
							name: json.Show.name[0],
							seasons: json.Show.totalseasons[0]
						},
						season: []
					};
					var seasons	= json.Show.Episodelist[0].Season;	
					seasons.forEach(function(season){
						var list = {
							id: season['$'].no,
							no: season['$'].no,
							episode: []
						};
						season.episode.forEach(function(episode) {
							var row = {
								id: episode.seasonnum[0],
								season: list.id,
								episode: episode.seasonnum[0],
								airdate: episode.airdate[0],
								title: episode.title[0]
							};
							list.episode.push(row);
						});
						records.season.push(list);
					});
					if (typeof(callback) == 'function') callback(records);
				});
			} catch(e) {
				console.log(e.message);
			}
		});
	},
	
	episode: function(showid, sid, eid, callback) {
		// Get specific episode info
		var url = 'http://services.tvrage.com/feeds/episodeinfo.php?sid=' + showid + '&ep=' + sid + 'x' + eid;
		request.get(url, function(error, res, xml) {
			if (error) return;
			try {
				parser.parseString(xml, function(error, json){
					var episode = json.show.episode[0];
					var record = {
						season: sid,
						episode: eid,
						title: episode.title[0],
						airdate: episode.airdate[0],
						link: episode.url[0]
					};
					if (typeof(callback) == 'function') callback(record);
				});
			} catch(e) {
				console.error(e.message);
			}
		});
	}
}