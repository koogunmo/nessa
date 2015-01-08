'use strict';

var uuid	= require('node-uuid'),
	log4js	= require('log4js'),
	ObjectID = require('mongodb').ObjectID,
	users	= require('nodetv-users');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:auth');

module.exports = function(app, db){
	
	/* Authentication Middleware */
	app.all('/api/*', function(req,res,next){
		users.check(req.headers.session).then(function(user){
			req.user = user;
			return next();
		}, function(error){
		//	if (!nconf.get('installed')) return res.status(418).end();
			return res.status(401).end();
		});
	});
	
	
	/* Authentication routes */
	app.post('/auth/check', function(req,res){
		users.check(req.headers.session).then(function(user){
			res.status(200).end();
		}, function(error){
			res.status(401).send(response);
		});
		
	}).post('/auth/login', function(req, res){
		users.login(req.body).then(function(success){
			res.status(200).send(success);
		}, function(error){
			res.status(401).send(error);
		});
	}).post('/auth/logout/:flush?', function(req,res){
		users.logout(req.headers.session).then(function(){
			res.status(204).end();
		}, function(error){
			res.status(400).end();
		});
	});
}