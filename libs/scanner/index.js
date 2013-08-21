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

module.exports = exports = {
	shows: function(){
		logger.info('Scanning shows...');
		if (base = nconf.get('shows:base')) {
			fs.readdir(base, function(error, dirs){
				if (error) {
					logger.log(error);
					return;
				}
				dirs.forEach(function(dir){
					fs.stat(base + '/' + dir, function(error, stat){
						if (error) {
							logger.error(error);
							return;	
						}
						if (stat && stat.isDirectory()){
							db.get("SELECT * FROM show WHERE name = ? AND directory IS NULL", dir, function(error, row){
								if (error) {
									logger.error(error);
									return;
								}
								if (row !== undefined) {
									db.run("UPDATE show SET status = 1, directory = ? WHERE id = ?", dir, row.id);
									
								//	events.emit('scanner.shows', null, row.id);
									
								} else {
									/*
									db.run('INSERT INTO show (status,name,directory) VALUES (1,?,?)', dir, folder, function(error, result){
										
									});
									*/
								}
							});
						}
					});
				});
			});
			events.emit('scanner.shows', null, null);
		}
	},
	
	episodes: function(showid, season, episode){
		if (base = nconf.get('shows:base')) {
			if (showid === undefined) {
				return;
			}
			
			db.get("SELECT id, name, directory FROM show WHERE status = 1 AND id = ?", showid, function(error, show){
				try {
					if (error) {
						logger.error(error);
						return;
					}
					if (!show.directory) return;
					
					logger.info(show.name + ': Scanning episodes...');
					var showdir = base + '/' + show.directory;
					
					listDirectory(showdir, function(filepath){
						var file = filepath.replace(showdir + '/', '');
						var data = helper.getEpisodeNumbers(file);
						
						// Episode number range
						if (data.episodes.length > 1) {
							var ep = helper.zeroPadding(data.episodes[0])+'-'+helper.zeroPadding(data.episodes[data.episodes.length-1]);
						} else {
							var ep = helper.zeroPadding(data.episodes[0]);
						}
						// Title formatting
						db.all("SELECT * FROM show_episode WHERE show_id = ? AND season = ?", show.id, data.season, function(error, rows){
							if (error) {
								logger.error(error);
								return;
							}
							var title = [];
							rows.forEach(function(row){
								if (data.episodes.indexOf(row.episode) >= 0) {
									title.push(row.title);
								}
							});
							var newName = 'Season '+helper.zeroPadding(data.season)+'/Episode '+ep+' - '+title.join('; ')+path.extname(file);
							if (file != newName) {
								helper.moveFile(showdir + '/' + file, showdir + '/' + newName);
							}
							// Update Database records
							data.episodes.forEach(function(episode){
								db.run("UPDATE show_episode SET file = ? WHERE show_id = ? AND season = ? AND episode = ?", [newName, showid, data.season, episode], function(error, res){
									console.log(error, res);
								});
							});
						});
						events.emit('scanner.episodes', null, show.id);
					});
				} catch(e) {
					logger.error(e.message);
				}
			});
		}
	}
};