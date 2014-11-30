/* Scan local filesystem for shows and episodes */

var fs		= require('fs'),
	log4js	= require('log4js'),
	mime	= require('mime'),
	path	= require('path'),
	trakt	= require('nodetv-trakt');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-scanner');


function listDirectory(path, callback) {
	fs.readdir(path, function(error, list){
		if (error) {
			logger.error(error);
			return;
		}
		list.forEach(function(item){
			var fullpath = path + '/' + item;
			fs.stat(fullpath, function(error, stat){
				if (error) {
					logger.error(error);
					return;
				}
				if (stat.isDirectory()){
					listDirectory(fullpath, callback);
				} else if (stat.isFile()) {
					if (item.match(/^\./)) return;
					if (typeof(callback) == 'function') callback(fullpath);
				}
			});
		});
	});
}

var episodeCollection = db.collection('episode'),
	movieCollection = db.collection('movie'),
	showCollection = db.collection('show');

var Scanner = {
	
	movies: function(user, callback){
		var self = this;
		
		logger.debug('Movies: Scanning...')
		
		if (base = nconf.get('media:base') + nconf.get('media:movies:directory') + '/A-Z/') {
			listDirectory(base, function(file){
				var ext = path.extname(file), name = path.basename(file, ext);
				
				if (!ext.match(/(avi|mkv|mp4)/i)) return;
				
				var record = {
					status: true,
					title: null,
					year: null,
					file: file.replace(base+'/', ''),
					quality: null
				};
				
				if (name.match(/\((\d{4})\)\s?\[(1080p|720p)\]$/i)){
					var matched = name.match(/^(.+)\s?\((\d{4})\)\s?\[(\d{3,4}p)\]$/i);
					record.title	= matched[1].trim();
					record.year		= parseInt(matched[2], 10);
					record.quality	= matched[3];
					
				} else if (name.match(/^(.*)\s?\[(\d{4})\]$/i)){
					var matched = name.match(/^(.*)\s?\[(\d{4})\]$/i);
					record.title	= matched[1].trim();
					record.year		= parseInt(matched[2], 10);
				} else {
					// erm?
				}
			//	if (record.title.match(/, The/)) record.title = 'The '+record.title.replace(/, The/, '');
				
				logger.debug(record)
				
				trakt(user.trakt).search('movies', record.title, function(error, results){
					if (error) return logger.error(error);
					if (results.length) {
						var exact = [], shortlist = [];
						if (record.year){
							results.forEach(function(result){
								if (result.year == record.year) {
									shortlist.push(result);
									if (result.title == record.title) exact.push(result);
								}
							})
							if (exact.length == 1) shortlist = exact;
						} else {
							shortlist = results;
						}
						
						logger.debug(shortlist)
						
						if (shortlist.length == 1){
							var result		= shortlist[0];
							record.title	= result.title;
							record.year		= result.year;
							record.synopsis	= result.overview;
							record.tmdb		= result.tmdb_id;
							record.imdb		= result.imdb_id;
							record.genre	= result.genres;
						} else {
							// Filter the results
							record.unmatched = shortlist;
						}
					}
				//	movieCollection.update({file: record.file}, {$set: record}, {upsert: true}, function(error, affected){
				//		if (typeof(callback) == 'function') callback(null, record);
				//	});
				});
			});
			
		}
	},
	
	shows: function(user, callback){
		
		var unmatched = db.collection('unmatched');
		
		logger.debug('Movies: Scanning...')
		
		// Scan media directory for folders - calback is called for each item found
		var self = this;
		if (base = nconf.get('media:base') + nconf.get('media:shows:directory')) {
			fs.readdir(base, function(error, dirs){
				if (error) return;
				dirs.forEach(function(dir){
					fs.stat(base + '/' + dir, function(error, stat){
						if (error) return;
						if (stat && stat.isDirectory()){
							showCollection.find({$or: [{name: dir},{directory: dir}]}).toArray(function(error, results){
								if (error) return;
								var record = {
									status: true,
									directory: dir
								};
								if (results.length == 1) {
									var result = results[0];
									showCollection.update({tvdb: result.tvdb}, {$set: record}, {upsert: true}, function(error, affected){
										if (typeof(callback) == 'function') callback(null, result.tvdb);
									});
									trakt(user.trakt).show.library(result.tvdb);
								} else {
									unmatched.update({directory: dir}, {$set: record}, {upsert: true}, function(error, result){
										logger.debug('Unmatched: '+dir);
									});
								}
							});
						}
					});
				});
			});
		}
	},
	
	episodes: function(user, tvdb, callback){
		var self = this;
		tvdb = parseInt(tvdb, 10);
		if (base = nconf.get('media:base') + nconf.get('media:shows:directory')) {
			showCollection.findOne({tvdb: tvdb, status: {$exists: true}}, function(error, show){
				if (error || !show) return;
				try {
					var showdir = base + '/' + show.directory;
					
					listDirectory(showdir, function(filepath){
						var file = filepath.replace(showdir + '/', '');
						var data = helper.getEpisodeNumbers(file);
						if (!data || !data.episodes) return;
						
						// Title formatting
						episodeCollection.find({tvdb: tvdb, season: data.season}).toArray(function(error, rows){
							if (error) return;
							var episodes = [];
							var library = [];
							
							rows.forEach(function(row){
								if (data.episodes.indexOf(row.episode) == -1) return;
								episodes.push({
									episode: row.episode,
									title: row.title
								});
							});
							if (!episodes.length) return;
							
							var target = helper.formatName({
								season:	data.season,
								episodes: episodes,
								ext: path.extname(file)
							});
							
							if (file != target) helper.fileMove(showdir + '/' + file, showdir + '/' + target);
							
							// Update episode documents
							var record = {
								status: true,
								file: target,
								mime: mime.lookup(target)
							};
							episodeCollection.update({tvdb: tvdb, season: data.season, episode: {$in: data.episodes}}, {$set: record}, {w:0})
							
							data.episodes.forEach(function(episode){
								library.push({
									season: data.season,
									episode: episode
								});
							});
							trakt(user.trakt).show.episode.library(tvdb, library);
						});
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		}
	}
};

module.exports = exports = Scanner;