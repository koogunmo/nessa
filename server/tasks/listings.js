'use strict';

/* Update show listings from XML */
module.exports = function(app,db,socket){
	try {
		var schedule	= require('node-schedule');
		var shows		= require('nodetv-shows');
		var ObjectID	= require('mongodb').ObjectID;
		
		var updateListings = function(){
			socket.emit('alert', {message: 'Updating TV listings'})
			// Update show listings
			shows.getShowlist();
			
			// Update existing show information (synopsis, artwork, etc)
			var showCollection = db.collection('show'),
				userCollection = db.collection('user');
			
			showCollection.find({'ended':false,'status':{$exists:true}}).toArray(function(error,results){
				if (error) logger.error(error);
				if (results){
					results.forEach(function(show){
						shows.getArtwork(show.tvdb);
						shows.getFeed(show.tvdb);
						shows.getSummary(show.tvdb);
						shows.getListings(show.tvdb, function(error,tvdb){
							shows.getHashes(show.tvdb);
						});
						
						if (show.users && show.users.length >= 1){
							show.users.forEach(function(user){
								userCollection.findOne({'_id':ObjectID(user._id),'trakt':{$exists:true}},{'trakt':1}, function(error, user){
									shows.getProgress(user, show.tvdb);
								});
							});
						}
					});
				}
			});
		}
		
		// Update daily at 2am
		var rule = new schedule.RecurrenceRule();
			rule.hour		= 2;
			rule.minute		= 0;
		
		schedule.scheduleJob(rule, updateListings);
	} catch(e){
		console.error(e.message);
	}
}