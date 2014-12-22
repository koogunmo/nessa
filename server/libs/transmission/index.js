var fs		= require('fs'),
	log4js	= require('log4js'),
	path	= require('path'),
	rpc		= require('transmission'),
	trakt	= require('nodetv-trakt'),
	uuid	= require('node-uuid'),
	ObjectID = require('mongodb').ObjectID;
	

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
	},
	
	
	getComplete: function(callback){
		// Get a list of completed torrents
		this.rpc.get(function(error, data){
			if (error) logger.error(error);
			var list = [];
			
			if (data && data.torrents){
				data.torrents.forEach(function(torrent){
					if (torrent.percentDone != 1) return;
					var object = {
						id: parseInt(torrent.id,10),
						dir: torrent.downloadDir,
						title: torrent.name,
						files: torrent.files,
						hash: torrent.hashString.toUpperCase(),
						bytes: torrent.totalSize
					};
					list.push(object);
				});
			}
			if (typeof(callback) == 'function') callback(error, list);
		});
	}
};

module.exports = exports = torrent.connect();