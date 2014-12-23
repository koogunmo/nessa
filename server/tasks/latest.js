'use strict';

/* Check for new download availability */
module.exports = function(app,db,socket){
	try {
		var schedule = require('node-schedule');
		var movies = require('nodetv-movies'), shows = require('nodetv-shows');
		
		var checkLatest = function(){
			if (movies.getLatest) movies.getLatest();
			if (shows.getLatest) shows.getLatest();
		};
		
		var rule = new schedule.RecurrenceRule();
			rule.minute		= [0,30];
		schedule.scheduleJob(rule,checkLatest);
		checkLatest();
	} catch(e){
		logger.error(e.message)
	}
}