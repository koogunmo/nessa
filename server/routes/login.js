'use strict';

var uuid	= require('node-uuid'),
	log4js	= require('log4js');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:login');

module.exports = function(app, db){
	app.post('/api/auth/check', function(req, res){
		var response = {success: false};
		
		if (nconf.get('security:whitelist')) {
			var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			// Is there a list of allowed IPs?
			var blocks = nconf.get('security:whitelist').split(',');
			var netmask = require('netmask').Netmask;
			blocks.forEach(function(mask){
				var block = new netmask(mask);
				if (block.contains(ip)) {
					response.success = true;
				}
			});
		}
		if (!req.body.session) return res.send(response);
		
		var userCollection = db.collection('user');
		userCollection.count(function(error, count){
			if (error) logger.error(error);
			if (count){
				userCollection.findOne({session: req.body.session}, function(error, result){
					if (error) logger.error(error);
					if (result) {
						response.success = true;
						userCollection.update({_id: result._id}, {$set: {last: Date.now()}}, function(error, affected){});
						return res.send(response);
					}
					res.send(response);
				});
			} else {
				response.success = true;
				res.send(response);
			}
		});
		
	}).post('/api/auth/login', function(req, res){
		var ObjectID = require('mongodb').ObjectID;
		
		var userCollection = db.collection('user');
		var response = {
			success: false
		};
		
		var hashed = require('crypto').createHash('sha256').update(req.body.password).digest('hex');
		userCollection.findOne({username: req.body.username, password: hashed}, function(error, result){
			if (error) {
				res.send(response);
				return;
			}
			if (result){
				response.success = true;
				response.session = uuid.v4();
				userCollection.update({_id: result._id}, {$set: {session: response.session, last: Date.now()}}, function(error, affected){
				//	logger.log(error, affected);
				});
			}
			res.send(response);
		});
		
	}).post('/api/auth/logout', function(req,res){
		if (req.body.session){
			var userCollection = db.collection('user');
			userCollection.findOne({session: req.body.session}, function(error, result){
				result.session = null;
				userCollection.save(result, function(error, affected){
				//	logger.log(error, affected);
				});
			});
		}
		res.send({success: true});
	});
}