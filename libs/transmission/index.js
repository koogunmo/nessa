var transmission = require('transmission');

module.exports = exports = {
	rpc: null,
	
	connect: function() {
		// Create connection
		this.rpc = new transmission({
			host: nconf.get('transmission:host'),
			port: nconf.get('transmission:port'),
			username: nconf.get('transmission:username'),
			password: nconf.get('transmission:password')
		});
		return this;
	},
	
	add: function(id, magnet) {
		try {
			this.rpc.add(magnet, function(error, args){
				if (error) {
					logger.error(error);
					return;
				}
				db.exec("UPDATE show_episode SET hash = ? WHERE id = ?", args.hashString, id);
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	clean: function(){
		try {
			this.rpc.get(function(error, args){
				if (error) {
					logger.error(error);
					return;
				}
				args.torrents.forEach(function(torrent){
				//	console.log(torrent.name, torrent);
					if (torrent.isFinished) {
						logger.info('Removing: '+torrent.name);
				//		this.rpc.remove(torrent.id, true);
					}
				});
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	
	complete: function() {
		try {
			// get a list of all completed torrents
			this.rpc.get(function(error, data){
				if (error) return;
				var response = [];
				data.torrents.forEach(function(torrent){
					// Has it finished downloading?
					if (torrent.percentDone < 1) return;
					
					// Have we already moved it?
					db.get("SELECT * FROM show_episode WHERE hash = ? AND file IS NULL", torrent.hashString, function(error, args){
						// rename/move/etc
						
					});
					
					// Merge in 'clean' method?
					if (torrent.isFinished) {
						logger.info('Removing: '+torrent.name);
					//	exports.rpc.remove(torrent.id);	
					}
				});
			});
		} catch(e) {
		//	console.log('e.message');
		}
	}
};