/* Update show listings from XML */
try {
	var schedule	= require('node-schedule');
	var shows		= plugin('showdata');
	
	function updateListings(){
		// Update show listings
		shows.getShowlist();
		// Update existing show information (synopsis, artwork, etc)
		var showCollection = db.collection('show');
		showCollection.find({status: {$exists: true}}).toArray(function(error, results){
			if (error){
				console.error(error);
				return;
			}
			if (results){
				results.forEach(function(show){
					shows.getArtwork(show.tvdb);
					shows.getProgress(show.tvdb);
					shows.getSummary(show.tvdb, function(error, tvdb){
						shows.getFullListings(tvdb);
						shows.getHashes(tvdb);
					});
				});
			}
		});
	}
	
	/* Every night at 1am */
	var rule = new schedule.RecurrenceRule();
		rule.hour		= 1;
		rule.minute		= 0;
	
	schedule.scheduleJob(rule, updateListings);
} catch(e){
	console.error(e.message);
}