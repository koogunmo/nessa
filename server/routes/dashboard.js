'use strict';

var log4js	= require('log4js'),
	trakt	= require('nodetv-trakt');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:dashboard');

module.exports = function(app, db){
	
	var movies = require('nodetv-movies'), shows = require('nodetv-shows');
	
	
	app.get('/api/latest/shows', function(req,res){
		
	})


	
	
	app.get('/api/:session?/dashboard/latest', function(req,res){
		shows.latest(req.user, function(error, json){
			if (error) {
				logger.error(error);
				return res.status(404).end;
			}
			if (json){
				res.send(json);
				
			}
		});
	});
	
	
	

	app.get('/api/:session?/dashboard/unmatched', function(req,res){
	//	trakt(req.user.trakt).calendar.shows(function(error, json){
	//		res.send(json);
	//	});
	});
	
	app.get('/api/:session?/dashboard/upcoming', function(req,res){
		trakt(req.user.trakt).calendar.shows(function(error, json){
			res.send(json);
		});
	});


};