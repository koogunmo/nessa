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
		// Scan media directory for folders - calback is called for each item found
		var self = this;
		if (base = nconf.get('shows:base')) {
			fs.readdir(base, function(error, dirs){
				if (error) return;
				dirs.forEach(function(dir){
					fs.stat(base + '/' + dir, function(error, stat){
						if (error) return;
						if (stat && stat.isDirectory()){
							db.get("SELECT * FROM show WHERE name = ?", dir, function(error, row){
								if (error) return;
								if (row === undefined) {
									// Not in database, queue to find later
									db.run('INSERT INTO show_unmatched (directory) VALUES (?)', dir, function(error){
										if (error) return;
									});
									return;
								}
								if (!row.directory) {
									db.run("UPDATE show SET status = 1, directory = ? WHERE id = ?", dir, row.id);
									if (typeof(callback) == 'function') callback(null, row.id);
								}
								if (row.tvdb) trakt.show.library(row.tvdb);
							});
						}
					});
				});
			});
		}
	},
	
	episodes: function(id, callback){
		var self = this;
		if (base = nconf.get('shows:base')) {
			db.get("SELECT id, name, directory FROM show WHERE directory IS NOT NULL AND id = ?", id, function(error, show){
				try {
					if (error || !show.directory) return;
					var showdir = base + '/' + show.directory;
					
					listDirectory(showdir, function(filepath){
						var file = filepath.replace(showdir + '/', '');
						var data = helper.getEpisodeNumbers(file);
						if (!data || !data.episodes) return;
						
						// Episode number range
						if (data.episodes.length > 1) {
							var ep = helper.zeroPadding(data.episodes[0])+'-'+helper.zeroPadding(data.episodes[data.episodes.length-1]);
						} else {
							var ep = helper.zeroPadding(data.episodes[0]);
						}
						// Title formatting
						db.all("SELECT E.*, S.tvdb FROM show_episode AS E INNER JOIN show AS S ON S.id = E.show_id WHERE E.show_id = ? AND E.season = ?", show.id, data.season, function(error, rows){
							if (error) return;
							var library = [];
							var title = [];
							var tvdb = null;
							rows.forEach(function(row){
								tvdb = row.tvdb;
								if (data.episodes.indexOf(row.episode) >= 0) {
									title.push(row.title);
								}
							});
							
							// TODO: Use helper.formatName
							
							var newName = 'Season '+helper.zeroPadding(data.season)+'/Episode '+ep+' - '+title.join('; ')+path.extname(file);
							if (file != newName) {
								helper.fileMove(showdir + '/' + file, showdir + '/' + newName);
							}
							// Update Database records
							data.episodes.forEach(function(episode){
								db.run("UPDATE show_episode SET status = 2, file = ? WHERE show_id = ? AND season = ? AND episode = ?", newName, show.id, data.season, episode, function(error){
									if (error) logger.error(error);
								});
								library.push({
									season: data.season,
									episode: episode
								})
							});
							trakt.show.episode.library(tvdb, library);
						});
					//	events.emit('scanner.episodes', null, show.id);
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		}
	}
};

module.exports = exports = Scanner;