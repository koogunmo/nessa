'use strict';

var uuid	= require('node-uuid'),
	log4js	= require('log4js'),
	netmask	= require('netmask').Netmask;

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:login');

module.exports = function(app, db){
	app.post('/api/auth/check', function(req, res){
		var response = {success: false, lastTime: Date.now()};
		if (nconf.get('security:whitelist')) {
			var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			// Is there a list of allowed IPs?
			if (nconf.get('security:whitelist')){
				var blocks = nconf.get('security:whitelist').split(',');
				if (blocks){
					blocks.forEach(function(mask){
						var block = new netmask(mask);
						if (block.contains(ip)) {
			//				response.success = true;
						}
					});
				}
			}
		}
		if (!req.body.session) return res.send(response);
		
		var userCollection = db.collection('user');
		userCollection.count(function(error, count){
			if (error) logger.error(error);
			if (count){
				userCollection.findOne({sessions: {$elemMatch: {session: req.body.session}}}, function(error, result){
					if (error) logger.error(error);
					if (result) {
						response.success = true;
						result.lastAccess = Date.now();
						userCollection.save(result, function(error, affected){});
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
		var response = {success: false, sessions: [], lastTime: Date.now()};
		
		var hashed = require('crypto').createHash('sha256').update(req.body.password).digest('hex');
		userCollection.findOne({username: req.body.username, password: hashed}, function(error, result){
			if (error) {
				res.send(response);
				return;
			}
			if (result){
				response.success = true;
				response.session = uuid.v4();
				
				result.lastAccess = Date.now();
				if (!result.sessions) result.sessions = [];
				result.sessions.push({
					session: response.session,
					timestamp: Date.now()
				});
				userCollection.save(result, function(error, affected){
					if (!error) res.send(response);
				});
			}
		});
		
	}).post('/api/auth/logout', function(req,res){
		var response = {success: true, session: false, lastTime: Date.now()};
		
		if (req.body.session){
			var userCollection = db.collection('user');
			userCollection.findOne({sessions: {$elemMatch: {session: req.body.session}}}, function(error, result){
				var sessions = [];
				result.sessions.forEach(function(session){
					if (!session.timestamp || session.session == req.body.session) return;
					sessions.push(session);
				});
				result.sessions = sessions;
				userCollection.save(result, function(error, affected){
					if (!error) res.send(response);
				});
			});
		}
	});
}