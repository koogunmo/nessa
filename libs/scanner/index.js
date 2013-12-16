/* Scan local filesystem for shows and episodes */

var fs		= require('fs'),
	path	= require('path');

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

var Scanner = {
	shows: function(callback){
		var collection = dbm.collection('show');
		var unmatched = dbm.collection('unmatched');
		
		// Scan media directory for folders - calback is called for each item found
		var self = this;
		if (base = nconf.get('shows:base')) {
			fs.readdir(base, function(error, dirs){
				if (error) return;
				dirs.forEach(function(dir){
					fs.stat(base + '/' + dir, function(error, stat){
						if (error) return;
						if (stat && stat.isDirectory()){
							collection.find({$or: [{name: dir},{directory: dir}]}).toArray(function(error, results){
								if (error) return;
								var record = {
									status: 1,
									directory: dir
								};
								if (results.length == 1) {
									var result = results[0];
									collection.update({tvdb: result.tvdb}, {$set: record}, {upsert: true}, function(error, affected){
										if (typeof(callback) == 'function') callback(null, result.tvdb);
									});
									trakt.show.library(result.tvdb);
								} else {
									unmatched.update({directory: dir}, {$set: record}, {upsert: true}, function(error, result){
										console.log('Unmatched: '+dir);
									});
								}
							});
						}
					});
				});
			});
		}
	},
	
	episodes: function(tvdb, callback){
		var self = this;
		if (base = nconf.get('shows:base')) {
			var showCollection = dbm.collection('show');
			var episodeCollection = dbm.collection('episode');
			
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
								episodes.push({
									episode: row.episode,
									title: row.title
								});
							});
							
							var target = helper.formatName({
								season:	data.season,
								episodes: episodes,
								ext: path.extname(file)
							})
							
							if (file != target) helper.fileMove(showdir + '/' + file, showdir + '/' + newName);
							
							// Update Database records
							data.episodes.forEach(function(episode){
								var record = {
									status: 2,
									file: target
								};
								episodeCollection.update({tvdb: tvdb, season: data.season, episode: episode}, {$set: record}, function(error, affected){
									console.log(error, affected);
								});
								
								library.push({
									season: data.season,
									episode: episode
								});
							});
							trakt.show.episode.library(tvdb, library);
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