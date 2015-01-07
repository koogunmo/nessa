'use strict';

/* Update show listings from XML */
module.exports = function(app,db,socket){
	try {
		var schedule	= require('node-schedule');
		var shows		= require('nodetv-shows');
		var ObjectID	= require('mongodb').ObjectID;
		
		var updateListings = function(){
			socket.emit('alert', {'message': 'Updating TV listings'})
			// Update show listings
			shows.getShowlist();
			
			// Update existing show information (synopsis, artwork, etc)
			var showCollection = db.collection('show'),
				userCollection = db.collection('user');
			
			showCollection.find({'ended':false,'status':{$exists:true}}).toArray(function(error,results){
				if (error) logger.error(error);
				if (results){
					results.forEach(function(show){
						
						shows.getSummary(show.imdb);
						shows.getArtwork(show.imdb);
						
						shows.getListings(show.imdb).then(function(){
							return shows.getFeed(show.imdb);
						}).then(function(){
							return shows.getHashes(show.imdb);
						});
						
						if (show.users){
							show.users.forEach(function(u){
								userCollection.findOne({'_id':ObjectID(u._id),'trakt':{$exists:true}},{'trakt':1}, function(error, user){
									shows.getProgress(user, show.imdb);
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