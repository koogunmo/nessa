'use strict';

var crypto = require('crypto'),
	ObjectID = require('mongodb').ObjectID;
	
var userCollection = db.collection('user');

var users = {
	
	get: function(id, callback){
		userCollection.findOne({_id: ObjectID(id)}, function(error, json){
			if (!json) json = {_id: null};
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	list: function(callback){
		userCollection.find().toArray(function(error, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	remove: function(id, callback){
		userCollection.remove({_id: ObjectID(id)}, function(error, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	update: function(data, callback){
		// Update or create a new user
		var record = {};
		
		if (data.username) record.username = data.username;
		if (data.password && data.passconf) {
			if (data.password == data.passconf) {
				record.password = crypto.createHash('sha256').update(data.password).digest('hex');
			}
		}
		userCollection.update({_id: ObjectID(data._id)}, {$set: record}, {upsert: true}, function(error, count, json){
			if (!error && !json.updatedExisting) {
				
			}
			if (typeof(callback) == 'function') callback(error, json);
		});
	},
	
	verify: function(){
		
	}
};
exports = module.exports = users;
