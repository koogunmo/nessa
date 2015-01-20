'use strict';

var log4js	= require('log4js');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:dashboard');

module.exports = function(app, db){
	var movies = require('nodetv-movies'), shows = require('nodetv-shows');
	
	app.get('/api/dashboard/movies/unmatched', function(req,res){
		movies.countUnmatched().then(function(count){
			res.send({'status':true,'count':count});
		}, function(){
			res.status(404).end();
		});
	});
	app.get('/api/dashboard/shows/unmatched', function(req,res){
		shows.countUnmatched().then(function(count){
			res.send({'status':true,'count':count});
		}, function(){
			res.status(404).end();
		});
	});
};