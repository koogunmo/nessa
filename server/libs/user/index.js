'use strict';

var crypto	= require('crypto'),
	log4js	= require('log4js'),
	ObjectID = require('mongodb').ObjectID;

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-user');


var showCollection = db.collection('show'),
	userCollection = db.collection('user');

var users = {
	
	add: function(){
		// Create new user
		
	},
	get: function(id, callback){
		// Get a user
		userCollection.findOne({_id: ObjectID(id)}, {password:0}, function(error, json){
			if (!json) json = {_id: null};
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	list: function(callback){
		// List all users
		userCollection.find().toArray(function(error, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	remove: function(id, callback){
		// Remove a user
		userCollection.findOne({_id: ObjectID(id)}, function(error, user){
			if (error) return logger.error(error);
			if (user.shows.length) {
				user.shows.forEach(function(show){
					// remove from show record
					showCollection.findOne({tvdb: show.tvdb}, function(error, show){
						var update = {
							$pull: {users: {_id: ObjectID(user._id)}}
						};
						if (show.users.length == 1) update.$set = {status: false};
						showCollection.update({tvdb: tvdb}, update, {w:0});
					});
				});
			}
			userCollection.remove({_id: ObjectID(id)}, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		});
	},
	update: function(id, data, callback){
		var update = {};
		if (data.username) update.username = data.username;
		if (data.password && data.passconf && data.password == data.passconf) {
			update.password = crypto.createHash('sha256').update(data.password).digest('hex');
		}
		if (data.phone) update.phone = data.phone;
		if (data.email) update.email = data.email;
		if (data.trakt) {
			if (data.hash) data.trakt.password = crypto.createHash('sha256').update(data.trakt.password).digest('hex');
			update.trakt = data.trakt;
		}
		console.log(update);
		return;
		/*
		userCollection.update({_id: ObjectID(id)}, {$set: update}, {upsert: true}, function(error, count, json){
		//	if (!error && !json.updatedExisting) {}
			if (typeof(callback) == 'function') callback(error, json);
		});
		*/
	}
};
exports = module.exports = users;
