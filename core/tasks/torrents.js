/* Check for completed downloads every 5 minutes */

setInterval(function(){
	torrent.complete();
}, 300000);

/*
var schedule	= require('node-schedule');
var rule = new schedule.RecurrenceRule();
	rule.minute		= [0,10,20,30,40,50];
schedule.scheduleJob(rule, function(){
	torrent.complete();
});
*/
