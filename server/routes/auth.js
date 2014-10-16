'use strict';

var uuid	= require('node-uuid'),
	log4js	= require('log4js'),
	ObjectID = require('mongodb').ObjectID;

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:auth');

module.exports = function(app, db){
	
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
	
	app.post('/auth/check', function(req, res){
		var response = {success: false, user: {}, session: null, lastAccess: Date.now()};
		userCollection.findOne({sessions: {$elemMatch: {session: req.body.session}}}, {password:0,sessions:0,shows:0,trakt:0}, function(error, result){
			if (error) logger.error(error);
			if (result) {
				response.user = result;
				response.session = req.body.session;
				response.success = true;
				var update = {
					lastAccess: response.lastAccess
				};
				userCollection.update({_id: ObjectID(result._id)}, {$set: update}, {w:0});
			}
			return res.send(response);
		});
		
	}).post('/auth/login', function(req, res){
		var response = {success: false, user: {}, session: null, lastAccess: Date.now()};
		var hashed = require('crypto').createHash('sha256').update(req.body.password).digest('hex');
		
		userCollection.findOne({username: req.body.username, password: hashed}, {password:0,sessions:0,shows:0,trakt:0}, function(error, result){
			var status = 200;
			if (error || !result) {
				console.error(error, result);
				status = 401;
			}
			if (result){
				response.user = result;
				response.success = true;
				response.session = uuid.v4();
				var session = {
					session: response.session,
					timestamp: response.lastAccess
				};
				userCollection.update({_id: ObjectID(result._id)}, {$push: {'sessions': session}}, {w:0});
			}
			res.send(response);
		});
		
	}).post('/auth/logout', function(req,res){
		var response = {success: true, user: {}, session: false, lastTime: Date.now()};
		if (req.body.session){
			var update = (req.body.all) ? {$set: {sessions:[]}} : {$pull: {sessions: {session: req.body.session}}};
			userCollection.update({sessions: {$elemMatch: {session: req.body.session}}}, update, {w:0});
			res.send(response);
		}
	});
}