/* Check for new episodes */

var schedule	= require('node-schedule');
var tvshows		= require(process.cwd() + '/libs/tvshows');

/* Every 30 mins */
var rule = new schedule.RecurrenceRule();
	rule.minute		= [0,30];

schedule.scheduleJob(rule, function(){
	tvshows.getLatest();
});



