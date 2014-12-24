'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:users');

module.exports = function(app, db, socket){
	var users	= require('nodetv-users');
	
	app.get('/api/users', function(req,res){
		// List users
		users.list(function(error, json){
			res.send(json);
		});
	}).post('/api/users', function(req,res){
		// Create user
		res.status(201).end();
	})
	
	app.get('/api/users/:id', function(req,res){
		users.get(req.params.id, function(error, user){
			if (error) logger.error(error);
			if (user) return res.status(200).send(user);
			return res.status(404).end();
		});
	}).post('/api/users/:id', function(req,res){
		// Update user
		users.update(req.params.id, req.body, function(error, json){
			if (error) logger.error(error);
			res.status(200).end();
		});
	}).delete('/api/users/:id', function(req,res){
		// Remove user
		users.remove(req.params.id, function(error, json){
			res.status(204).end();
		});
	})
};