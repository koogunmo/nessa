/* Update show listings from XML */
try {
	var schedule	= require('node-schedule');
	var shows		= plugin('showdata');
	
	function updateListings(){
		// Update show listings
		shows.getShowlist();
		
		// Update existing show information (synopsis, artwork, etc)
		var showCollection = db.collection('show'),
			userCollection = db.collection('user');
		
		userCollection.findOne({admin: true}, {trakt:1}, function(error, admin){
			if (error) return console.error(error);
			
			showCollection.find({status: {$exists: true}}).toArray(function(error, results){
				if (error) return console.error(error);
				
				if (results){
					results.forEach(function(show){
						shows.getArtwork(admin, show.tvdb);
						shows.getSummary(admin, show.tvdb, function(error, tvdb){
							shows.getFullListings(admin, tvdb);
							shows.getHashes(tvdb);
						});
						if (show.users && show.users.length >= 1){
							show.users.forEach(function(user){
								userCollection.findOne({username: user.username}, {trakt:1}, function(error, user){
									shows.getProgress(user, show.tvdb);
								});
							});
						}
					});
				}
			});
		});
	}
	
	// Update daily at 1am
	// need to do this more often
	var rule = new schedule.RecurrenceRule();
		rule.hour		= 1;
		rule.minute		= 0;
	
	schedule.scheduleJob(rule, updateListings);
} catch(e){
	console.error(e.message);
}