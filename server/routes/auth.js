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
var logger = log4js.getLogger('routes:auth');

module.exports = function(app, db, socket){
	
	var userCollection = db.collection('user');
	
	/* Authentication Middleware */
	app.all('/api/*', function(req,res,next){
		var session = (req.params.session) ? req.params.session : req.headers.session;
		db.collection('user').findOne({sessions: {$elemMatch: {session: session}}}, {_id:1,admin:1,trakt:1,username:1}, function(error, user){
			if (error) logger.error(error);
			if (!user){
				var response = {
					success: false,
					message: 'Not authorised'
				};
				res.status(401).send(response);
				return false;
			} else {
				req.user = user;
				return next();
			}
			return false;
		});
	});
	
	app.post('/auth/check/:session?', function(req, res){
		var response = {success: false, session: null, lastTime: Date.now()};
		userCollection.count(function(error,count){
			if (error) return logger.error(error);
			if (count){
				userCollection.findOne({sessions: {$elemMatch: {session: req.body.session}}}, function(error, result){
					if (error) return logger.error(error);
					if (result) {
						response.session = req.body.session;
						response.success = true;
						result.lastAccess = response.lastTime;
						userCollection.save(result, {w:0});
					}
					return res.send(response);
				});
			} else {
				response.success = true;
				return res.send(response);
			}
		});
		
	}).post('/auth/login', function(req, res){
		var ObjectID = require('mongodb').ObjectID;
		
		var response = {success: false, session: null, lastTime: Date.now()};
		
		var hashed = require('crypto').createHash('sha256').update(req.body.password).digest('hex');
		userCollection.findOne({username: req.body.username, password: hashed}, function(error, result){
			if (error || !result) {
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
		
	}).post('/auth/logout', function(req,res){
		var response = {success: true, session: false, lastTime: Date.now()};
		if (req.body.session){
			userCollection.findOne({sessions: {$elemMatch: {session: req.body.session}}}, function(error, result){
				var sessions = [];
				if (!req.body.all){
					result.sessions.forEach(function(session){
						if (!session.timestamp || session.session == req.body.session) return;
						sessions.push(session);
					});
				}
				result.sessions = sessions;
				userCollection.save(result, function(error, affected){
					if (!error) res.send(response);
				});
			});
		}
	});
}