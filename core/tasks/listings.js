/* Update show listings from XML */
var schedule	= require('node-schedule');
var tvshows		= plugin('showdata');
//var tvrage		= plugin('tvrage');

/* Every Sunday at 1am */
var rule = new schedule.RecurrenceRule();
	rule.dayOfWeek	= 0;
	rule.hour		= 1;
	rule.minute		= 0;

schedule.scheduleJob(rule, function(){
	// Update shows (current,cancelled,upcoming, etc)
	tvshows.list();
	
	// Update episodes for enabled shows
	tvshows.episodes();
	
});



