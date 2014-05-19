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
	var users	= plugin('user');
	
	app.get('/api/users', function(req,res){
		// List users
		users.list(function(error, json){
			res.send(json);
		});
		
	}).post('/api/users', function(req,res){
		// Create user
		
		
	});
	
	app.get('/api/user/:id', function(req,res){
		// Fetch user
		
	}).post('/api/user/:id', function(req,res){
		// Update user
		
	}).delete('/api/user/:id', function(req,res){
		// Remove user
		
	});
};