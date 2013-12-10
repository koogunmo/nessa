/* Update show listings from XML */
var schedule	= require('node-schedule');
var shows		= plugin('showdata');

function updateListings(){
	// Update show listings
	shows.getShowlist();
	
	// Update show information (synopsis, etc)
	db.each("SELECT * FROM show WHERE directory IS NOT NULL", function(error, show){
		if (error || !show) return;
//		shows.getInfo(show.id, false);
//		shows.getEpisodes(show.id, false)
	});
}

/* Every Sunday at 1am */
var rule = new schedule.RecurrenceRule();
	rule.dayOfWeek	= 0;
	rule.hour		= 1;
	rule.minute		= 0;

schedule.scheduleJob(rule, updateListings);
