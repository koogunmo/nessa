/* Update show listings from XML */
var schedule	= require('node-schedule');
var shows		= plugin('showdata');

function updateListings(){
	// Update show listings
	shows.getShowlist();
	
	// Update show information (synopsis, artwork, etc)
	var collection = db.collection('show');
	collection.find({status: {$exists: true}}).toArray(function(error, results){
		if (error || !results) return;
		results.forEach(function(show){
			shows.getArtwork(show.tvdb);
			shows.getSummary(show.tvdb, function(error, tvdb){
				shows.getFullListings(tvdb);
			});
		});
	});
}
shows.getShowlist();

/* Every Sunday at 1am */
var rule = new schedule.RecurrenceRule();
	rule.dayOfWeek	= 0;
	rule.hour		= 1;
	rule.minute		= 0;

schedule.scheduleJob(rule, updateListings);
