/* Check for software updates on Github */

var schedule = require('node-schedule');

/* Run every day at 3am */
var rule = new schedule.RecurrenceRule();
	rule.hour	= 3;
	rule.minute = 0;

schedule.scheduleJob(rule, function(){
	var system = plugin('system');
	system.update();
});