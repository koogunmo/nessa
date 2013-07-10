var transmission = require('transmission');

module.exports = exports = {
	rpc: null,
	
	connect: function() {
		this.rpc = new transmission({
			host: nconf.get('transmission:host'),
			port: nconf.get('transmission:port'),
			username: nconf.get('transmission:username'),
			password: nconf.get('transmission:password')
			
		}).on('error', function(error){
			
			// Handle the error in a useful way...
			logger.error(error);
			
		}).on('added', function(hash, id, name){
			
		});
		return this;
	},
	
	add: function(id, magnet) {
		try {
			this.rpc.add(magnet, function(error, args){
				if (error) return;
				db.run("UPDATE show_episode SET hash = ? WHERE id = ?", args.hashString, id);
			});
		} catch(e) {
			// ???	
		}
	},
	
	complete: function(callback) {
		try {
			// get a list of all completed torrents
			this.rpc.get(function(error, data){
				if (error) return;
				var response = [];
				data.torrents.forEach(function(torrent){
					if (torrent.percentDone < 1) return;
					var record = {
						id:		torrent.id,
						hash:	torrent.hashString,
						dir:	torrent.downloadDir,
						files:	torrent.files
					}
					response.push(record);
				});
				callback(response);
			});
		} catch(e) {
		//	console.log('e.message');
		}
	}
	
};