var transmission = require('transmission'),
	fs = require('fs'),
	path = require('path'),
	uuid = require('node-uuid');

/* Extend module */

transmission.prototype.blocklist = function(callback){
	var options = {
		arguments : {},
		method: 'blocklist-update',
		tag : uuid()
	}
	this.callServer(options, callback)
	
};

transmission.prototype.rename = function(id, path, name, callback){
	var options = {
		arguments : {
			ids : [id],
			path: path,
			name: name
		},
		method: 'torrent-rename-path',
		tag : uuid()
	}
	this.callServer(options, callback)
};

var torrent = {
	rpc: false,
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
	
	add: function(magnet, callback) {
		try {
			this.rpc.add(magnet, function(error, args){
				if (typeof(callback) == 'function') callback(error, args);
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	autoname: function(id, callback){
		var self = this;
		var showCollection = db.collection('show'),
			episodeCollection = db.collection('episode');
			
		this.rpc.get([id], function(error, args){
			args.torrents.forEach(function(torrent){
				var path = torrent.downloadDir+'/'+torrent.name;
				episodeCollection.findOne({hash: torrent.hashString.toUpperCase()}, function(error, row){
					if (error || !row) return;
					showCollection.findOne({tvdb: row.tvdb}, function(error, show){
						if (error || !show) return;
						
						var name = show.name+' S'+helper.zeroPadding(row.season)+'E'+helper.zeroPadding(row.episode)+' '+row.title;
						
						self.rpc.rename(torrent.id, path, name, function(error, args){
							console.log(error, args);
						});
					});
				});
			});
		});
	},
	
	blocklist: function(callback){
		try {
			this.rpc.blocklist(function(error, args){
				console.log(error, args);
			})
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	complete: function() {
		var self = this;
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		try {
			
			if (!this.rpc) return;
			// Get a list of all completed torrents
			this.rpc.get(function(error, data){
				if (error) return;
				
				var response = [];
				data.torrents.forEach(function(item){
					var hash = item.hashString.toUpperCase();
					
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
					
					episodeCollection.find({hash: hash, status: false}).toArray(function(error, results){
						if (error || !results.length) return;
						
						showCollection.findOne({tvdb: results[0].tvdb}, function(error, show){
							if (error || !show) return;
							
							var showdir = nconf.get('media:base') + nconf.get('media:shows:directory') + '/' + show.directory;
							
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
								episodeCollection.update({hash: hash}, {$set: record}, function(error, affected){
									if (error) return;
								});
								trakt.show.episode.library(tvdb, library);
							});
						});
					});
					/* Remove if seeding is completed */
					if (item.isFinished) {
						episodeCollection.count({hash: hash}, function(error, count){
							if (error) return;
							if (count >= 1){
								self.rpc.remove({id: item.id, purge: true}, function(error){
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