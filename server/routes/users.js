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
		users.list(req.user).then(function(json){
			res.send(json);
		}, function(){
			res.status(404).end();
		});
	}).post('/api/users', function(req,res){
		users.add(req.user, req.body).then(function(user){
			res.status(201).end();
		}, function(){
			res.status(400).end();
		});
	})
	
	app.get('/api/users/:id', function(req,res){
		users.get(req.user, req.params.id).then(function(user){
			res.send(user);
		}, function(error){
			res.status(404).end();
		});
	}).post('/api/users/:id', function(req,res){
		users.update(req.user, req.params.id, req.body).then(function(json){
			res.status(200).end();
		}, function(error){
			res.status(400).end();
		});
	}).delete('/api/users/:id', function(req,res){
		users.remove(req.user, req.params.id).then(function(json){
			res.status(204).end();
		}, function(){
			res.status(404).end();
		});
	})
};