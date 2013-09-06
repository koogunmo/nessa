/* Update show listings from XML */
var schedule	= require('node-schedule');
var shows		= plugin('showdata');

/* Every Sunday at 1am */
var rule = new schedule.RecurrenceRule();
	rule.dayOfWeek	= 0;
	rule.hour		= 1;
	rule.minute		= 0;

schedule.scheduleJob(rule, function(){
	// Update show listings
	shows.list();
});



