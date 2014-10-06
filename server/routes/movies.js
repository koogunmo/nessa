'use strict';

var log4js	= require('log4js');
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
			
			if (error) console.error(error);
			if (results){
				res.send(results);
			} else {
				res.status(404).end();
			}
		});
	});
}