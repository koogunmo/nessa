var transmission = require('transmission');
var path = require('path');

var torrent = {
	rpc: null,
	connect: function() {
		var self = this;
		// Create connection
		this.rpc = new transmission({
			host: nconf.get('transmission:host'),
			port: nconf.get('transmission:port'),
			username: nconf.get('transmission:username'),
			password: nconf.get('transmission:password')
		});
		return this;
	},
	add: function(obj) {
		try {
			if (!this.rpc) {
				console.log('Unable to connect to Transmission');
				return;
			}
			// TO DO: reformat magnet to add extra trackers
			this.rpc.add(obj.magnet, function(error, args){
				if (error) {
					logger.error('bt:add', error);
					return;
				}
				if (args) {
					obj.id.forEach(function(id){
						db.run("UPDATE show_episode SET hash = ?, status = 1 WHERE id = ?", args.hashString, id, function(error, args){
							if (error) logger.error(error);
						});
					});
				}
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	complete: function() {
		var self = this;
		try {
			if (!this.rpc) {
				console.log('Unable to connect to Transmission');
				return;
			}
			// Get a list of all completed torrents
			this.rpc.get(function(error, data){
				if (error) {
					logger.error(error);
					return;
				}
				var response = [];
				data.torrents.forEach(function(item){
					// Has it finished downloading?
					if (item.percentDone < 1) return;
					
					/* Copy and rename file */
					if (item.files.length == 1) {
						var file = item.downloadDir + '/' + item.files[0].name;
					} else {
						var file = null;
						var size = 0;
						item.files.forEach(function(k){
							if (k.length > size) {
								file = item.downloadDir + '/' + k.name;
								size = k.size;
							}
						});
					}
					var data = helper.getEpisodeNumbers(file);
					if (!data || !data.episodes) return;
					
					/* Episode number range */
					if (data.episodes.length > 1) {
						var ep = helper.zeroPadding(data.episodes[0])+'-'+helper.zeroPadding(data.episodes[data.episodes.length-1]);
					} else {
						var ep = helper.zeroPadding(data.episodes[0]);
					}
					
					db.all("SELECT S.name, S.directory, E.* FROM show_episode AS E INNER JOIN show AS S ON S.id = E.show_id WHERE E.hash = ? AND E.file IS NULL", item.hashString, function(error, results){
						if (error) {
							logger.error('transmission#85 ' + error);
							return;
						}
						if (!results.length) return;
						
						var showdir = nconf.get('shows:base') + '/' + results[0].directory;
						var title = [];
						
						results.forEach(function(row){
							title.push(row.title);
						});
						var newName = 'Season '+helper.zeroPadding(data.season)+'/Episode '+ep+' - '+title.join('; ')+path.extname(file);
						
						var date = new Date();
						var downloaded = date.getFullYear()+'-'+helper.zeroPadding(date.getMonth()+1)+'-'+helper.zeroPadding(date.getDay());
						
						helper.copyFile(file, showdir + '/' + newName, function(){
							db.run("UPDATE show_episode SET file = ?, status = 2, downloaded = ? WHERE hash = ?", newName, downloaded, item.hashString, null, function(error){
								if (error) logger.error(error);
							});
						});
					});
					
					/* Remove if seeding is completed */
					if (item.isFinished) {
						db.get("SELECT COUNT(id) AS count FROM show_episode WHERE hash = ? GROUP BY hash", item.hashString, function(error, row){
							if (error) {
								logger.error('transmission#112 ' + error);
								return;
							}
							if (row === undefined) return;
							if (row.count >= 1) {
								logger.info('Removing: ' + item.name);
								self.rpc.remove(item.id, true, function(error){
									if (error) logger.error(error);
								});
							}
						});
					}
				});
			});
		} catch(e) {
			logger.error(e.message);
		}
	}
};

module.exports = exports = torrent.connect();