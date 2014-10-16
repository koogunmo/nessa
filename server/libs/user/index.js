'use strict';

var crypto		= require('crypto'),
	log4js		= require('log4js'),
	notp		= require('notp'),
	ObjectID	= require('mongodb').ObjectID;

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
			if (error) return logger.error(error);
			if (!json) json = {_id: null};
			/*
			if (!json.mfa) {
				var secret = notp.totp.gen();
				json.mfa = {
					confirmed: false,
					enabled: false,
					secret: {
						ascii: secret,
						base32: ''
					}
				}
			} else if (!json.mfa.secret){
				json.mfa.secret.ascii = notp.totp.gen()
			}
			*/
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
		userCollection.findOne({_id: ObjectID(id)}, function(error, user){
			if (error) return logger.error(error);
			showCollection.update({'users._id': ObjectID(id)}, {$pull: {users: {_id: ObjectID(id)}}}, {multi:true, w:0});
			userCollection.remove({_id: ObjectID(id)}, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		});
	},
	update: function(data, callback){
		if (data._id) {
			var id = data._id;
			delete data._id;
		} else {
			var id = new ObjectID();
		}
		if (data.password && data.passconf){
			if (data.password == data.passconf) {
				data.password = crypto.createHash('sha256').update(data.password).digest('hex');
			}
			delete data.passconf;
		}
		if (data.trakt) {
			if (data.hash) data.trakt.password = crypto.createHash('sha256').update(data.trakt.password).digest('hex');
			data.trakt = data.trakt;
		}
		if (data.mfa) {
			if (data.mfa.enabled){
				if (notp.totp.verify(data.mfa.confirm, data.mfa.secret.ascii)) {
					data.mfa.confirmed = true;
				} else {
					data.mfa.enabled = false;
				}
			} else {
				delete data.mfa.secret;
			}
			delete data.mfa.confirm;
		}
		userCollection.update({_id: ObjectID(id)}, {$set: data}, {upsert: true}, function(error, count, json){
			if (typeof(callback) == 'function') callback(error, json);
		});
	}
};
exports = module.exports = users;
