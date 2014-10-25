'use strict';

var log4js		= require('log4js');


log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:movies');

module.exports = function(app,db,socket){

	var scanner	= plugin('scanner'),
		movies	= plugin('moviedata');

	app.get('/api/:session?/movies', function(req,res){
		// Get show list
		movies.list(function(error,results){
			if (error) {
				logger.error(error);
				return res.status(404).end();
			}
			if (results) return res.send(results);
		});
	});
	
	
	app.get('/api/:session?/movies/unmatched', function(req,res){
		// Get list of unmatched movies
		movies.unmatched(function(error,results){
			if (error) {
				logger.error(error);
				return res.status(404).send(error);
			}
			if (results) return res.send(results);
		});
	})
	
	app.post('/api/:session?/movies/unmatched', function(req,res){
		// Save manual matches
		movies.match(req.body);
		return res.status(202).end();
	})
}