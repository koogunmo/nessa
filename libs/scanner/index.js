/* Scan local filesystem for shows and episodes */

var fs		= require('fs');

module.exports = exports = {
	shows: function(){
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
									// Scan episodes?
								} else {
							//		db.run('INSERT INTO show (status,name,directory) VALUES (1,?,?)', dir, folder);
								}
								// Fetch episode listings for this show
								
							});
						}
					});
				});
			});
		}
	},
	
	episodes: function(showid){
		if (base = nconf.get('shows:base')) {
			
			db.get("SELECT * FROM show WHERE id = ?", showid, function(error, show){
				if (error) {
					logger.error(error);
					return;
				}
				showdir = base + '/' + show.directory;
				fs.readdir(showdir, function(error, list){
					list.forEach(function(item){
						fs.stat(showdir + '/' + item, function(error, stat){
							if (error) {
								logger.error(error);
								return;
							}
							
							if (stat.isDirectory()){
								// recurse
							} else {
								
								// RegExp file name, move, add to db
								
							}
							
							
						});
					});
				});
				
				
			});
			
			/*
			db.each("SELECT DISTINCT(E.season) AS season, S.directory FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id WHERE S.id = ? GROUP BY E.season", showid, function(error, episode){
				
				// TO DO: Season number formatting
				
				fs.readdir(base + '/' + episode.directory + '/Season ' + episode.season, function(error, files){
					
					files.forEach(function(file){
						// RegExp on filename
						
						console.log
						
						// Move/Rename file if not in Season ##/Episode ## - <title>.ext format
						
						if (match) {
					//		db.run("UPDATE show_episode SET file = ? WHERE showid = ? AND season = ? AND episode = ?", file, episode.id, episode.season, episode.episode);
						}
					});
				});
			});
			*/
		}
	}
};