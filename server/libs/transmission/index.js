var fs		= require('fs'),
	log4js	= require('log4js'),
	path	= require('path'),
	rpc		= require('transmission'),
	uuid	= require('node-uuid');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-transmission');

/* Extend module */

rpc.prototype.blocklist = function(callback){
	var options = {
		arguments : {},
		method: 'blocklist-update',
		tag : uuid()
	}
	this.callServer(options, callback);
};

/*
var Transmission = function(config, db){
	this.db = db;
	this.rpc = new rpc({
		host: config.host,
		port: config.port,
		username: config.username,
		password: config.password,
	});
	return this;
};
Transmission.prototype.add = function(magnet, callback){
	try {
		this.rpc.add(magnet, function(error, args){
			if (typeof(callback) == 'function') callback(error, args);
		});
	} catch(e) {
		logger.error('add: %s', e.message);
	}
	return this;
};
Transmission.prototype.blocklist = function(){
	try {
		this.rpc.blocklist(function(error, args){
			logger.log(error, args);
		});
	} catch(e) {
		logger.error('blocklist: %s', e.message);
	}
	return this;
};
Transmission.prototype.complete = function(callback){
	try {
		var showCollection = this.db.collection('show');
		var episodeCollection = this.db.collection('episode');
		
		this.rpc.get(function(error, data){
			if (error) return;
			
			var response = [];
			data.torrents.forEach(function(item){
				var hash = item.hashString.toUpperCase();
				
				// Has it finished downloading?
				if (item.percentDone < 1) return;
				
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
							if (typeof(show.trakt) == 'undefined') show.trakt = true;
							if (show.trakt) trakt.show.episode.library(tvdb, library);
						});
					});
				});
				if (item.isFinished) {
					episodeCollection.count({hash: hash}, function(error, count){
						if (error) return;
						if (count >= 1){
							this.remove({id: item.id, purge: true}, function(error){
								if (error) logger.error('complete.isFinished: %s', error);
							});
						}
					});
				}
			});
		});
	} catch(e) {
		logger.error('transmission.complete: %s', e.message);
	}
	
	return this;
};
Transmission.prototype.info = function(id, callback){
	try {
		this.rpc.get([id], function(error, args){
			if (error) logger.error(error);
			if (!error && typeof(callback) == 'function') callback(error, args);
		});
	} catch(e){
		logger.error(e.message);
	}
	return this;
};
Transmission.prototype.list = function(callback){
	try {
		this.rpc.get(function(error, args){
			if (error) logger.error(error);
			if (!error && typeof(callback) == 'function') callback(error, args);
		});
	} catch(e){
		logger.error('list: %s', e.message);
	}
	return this;
};
Transmission.prototype.remove = function(data){
	try {
		if (!data.id) return;
		if (!data.purge) data.purge = false;
		this.rpc.remove(data.id, data.purge, function(error){
			if (typeof(callback) == 'function') callback(error);
		});
	} catch(e){
		logger.error('transmission.list: %s', e.message);
	}
	return this;
};
Transmission.prototype.repacked = function(){
	try {
		this.list(function(error, transfers){
			if (error){
				logger.error(error);
				return;
			}
			transfers.torrents.forEach(function(transfer){
				if (transfer.hashString.toUpperCase() == hash) {
					this.remove({id: transfer.id, purge: true});
				}
			});
		});
	} catch(e){
		logger.error('repacked: %s', e.message);
	}
	return this;
};
Transmission.prototype.start = function(id, callback){
	this.rpc.start(id, callback);
	return this;
};
Transmission.prototype.stop = function(id, callback){
	this.rpc.stop(id, callback);
	return this;
};
*/

/************************************************************/

var torrent = {
	rpc: false,
	connect: function() {
		var self = this;
		// Create connection
		this.rpc = new rpc({
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
			logger.error('transmission.add: %s', e.message);
		}
	},
	
	blocklist: function(callback){
		try {
			this.rpc.blocklist(function(error, args){
				console.log(error, args);
			})
		} catch(e) {
			logger.error('transmission.blocklist: %s', e.message);
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
								if (typeof(show.trakt) == 'undefined') show.trakt = true;
								if (show.trakt) trakt.show.episode.library(tvdb, library);
							});
						});
					});
					/* Remove if seeding is completed */
					if (item.isFinished) {
						episodeCollection.count({hash: hash}, function(error, count){
							if (error) return;
							if (count >= 1){
								self.remove({id: item.id, purge: true}, function(error){
									if (error) logger.error('transmission.complete.isFinished: %s', error);
								});
							}
						});
					}
				});
			});
		} catch(e) {
			logger.error('transmission.complete: %s', e.message);
		}
	},
	
	info: function(id, callback){
		try {
			this.rpc.get([id], function(error, args){
				if (error) return;
				if (typeof(callback) == 'function') callback(error, args);
			});
		} catch(e){
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
			logger.error('transmission.list: %s', e.message);
		}
	},
	remove: function(data, callback){
		try {
			// TODO: make this better
			if (!data.id) return;
			if (!data.purge) data.purge = false;
			
			this.rpc.remove(data.id, data.purge, function(error){
				if (typeof(callback) == 'function') callback(error);
			});
		} catch(e){
			logger.error('transmission.list: %s', e.message);
		}
	},
	repacked: function(hash) {
		var self = this;
		try {
			// A torrent has been repacked - Trash the previous transfer
			self.list(function(error, transfers){
				transfers.torrents.forEach(function(transfer){
					if (transfer.hashString.toUpperCase() == hash) {
						self.remove({id: transfer.id, purge: true});
					}
				});
			});
		} catch(e){
			logger.error('transmission.repacked: %s', e.message);
		}
	},
	start: function(id, callback){
		this.rpc.start(id, callback);
	},
	stop: function(id, callback){
		this.rpc.stop(id, callback);
	}
};

module.exports = exports = torrent.connect();