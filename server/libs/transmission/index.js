var fs		= require('fs'),
	log4js	= require('log4js'),
	path	= require('path'),
	rpc		= require('transmission'),
	trakt	= require('nodetv-trakt'),
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


var episodeCollection = db.collection('episode'),
	showCollection = db.collection('show'),
	userCollection = db.collection('user');

/************************************************************/

/*
var Transmission = function(settings){
	
	
	return torrent;
}
*/


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
								file: target,
								downloaded: Date.now()
							};
							helper.fileCopy(file, showdir + '/' + target, function(){
								episodeCollection.update({hash: hash}, {$set: record}, {w:0});
								show.users.forEach(function(u){
									userCollection.findOne({_id: ObjectID(i._id)}, {trakt: 1}, function(error, user){
										if (error) logger.error(error)
										if (user) trakt(user.trakt).show.episode.library(tvdb, library);
									});
								});
							});
						});
					});
					
					// Remove if seeding is completed
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
	
	setStatus: function(id, status, callback){
		id = parseInt(id, 10);
		if (status) {
			this.rpc.start(id, callback);
		} else {
			this.rpc.stop(id, callback);
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