var transmission = require('transmission'),
	path = require('path'),
	uuid = require('node-uuid');

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
	
	add: function(obj, callback) {
		var self = this;
		var ObjectID = require('mongodb').ObjectID;
		var collection = db.collection('episode');
		
		try {
			if (!this.rpc) return;
			self.rpc.add(obj.magnet, function(error, args){
				if (error) return;
				if (args) {
					var record = {
						hash: args.hashString,
						status: false
					};
					obj.id.forEach(function(id){
						collection.update({_id: ObjectID(id)}, {$set: record}, function(error, affected){
					//		if (typeof(callback) == 'function') callback(null, true);
						});
					});
				}
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	blocklist: function(callback){
		// In theory, this should trigger a blocklist update
		try {
			this.rpc.callServer({
				method : this.rpc.methods.other.blockList,
				tag : uuid.v4()
			}, function(err, result) {
				if (err) {
					return callback(err)
				}
				var torrent = result['torrent-added']
				callback(err, torrent)
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	complete: function() {
		var self = this;
		var episodeCollection = db.collection('episode');
		
		try {
			if (!this.rpc) return;
			// Get a list of all completed torrents
			this.rpc.get(function(error, data){
				if (error) return;
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
							// The largest file is most likely the right one.
							if (k.length > size) {
								size = k.length;
								file = item.downloadDir + '/' + k.name;
							}
						});
					}
					var data = helper.getEpisodeNumbers(file);
					if (!data || !data.episodes) return;
					
					episodeCollection.find({hash: item.hashString}).toArray(function(error, results){
						if (error || !results.length) return;
						var showdir = nconf.get('shows:base') + '/' + results[0].directory;
						
						var tvdb = null;
						var episodes = [];
						var library	= [];
						
						results.forEach(function(row){
							if (!tvdb) tvdb = row.tvdb;
							episodes.push({
								episode: row.episode,
								title: row.title
							});
							library.push({
								season: row.season,
								episode: row.episode
							});
						});
						var target = helper.formatName({
							season: data.season,
							episodes: episodes,
							ext: path.extname(file)
						});
						var record = {
							status: true,
							file: target
						};
						helper.fileCopy(file, showdir + '/' + target, function(){
							episodeCollection.update({hash: item.hashString}, {$set: record}, function(error, affected){
								
							});
							trakt.show.episode.library(tvdb, library);
							
						//	events.emit('download.complete', {
						//		season: data.season,
						//		episode: ep,
						//		title: title.join('; ')
						//	})
						});
					});
					/* Remove if seeding is completed */
					if (item.isFinished) {
						episodeCollection.count({hash: item.hashString}, function(error, count){
							if (error) return;
							if (count >= 1){
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
	},
	
	list: function(callback){
		try {
			this.rpc.get(function(error, args){
				if (error) return;
				if (typeof(callback) == 'function') callback(error, args);
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	
	pause: function(data){
		
	},
	
	remove: function(data, callback){
		// TODO: make this better
		if (!data.id) return;
		if (!data.purge) data.purge = false;
		
		this.rpc.remove(data.id, data.purge, function(error){
			if (typeof(callback) == 'function') callback(error);
		});
	},
	
	repacked: function(hash) {
		var self = this;
		try {
			// A torrent has been repacked - Trash the previous transfer
			self.list(function(error, transfers){
				transfers.torrents.forEach(function(transfer){
					if (transfer.hashString == hash) {
						self.remove({id: transfer.id, purge: true});
					}
				});
			});
		} catch(e){
			logger.error(e.message);
		}
	},
	
	resume: function(data){
		
	}
};

module.exports = exports = torrent.connect();