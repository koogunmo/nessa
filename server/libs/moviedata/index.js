var MovieData = {
	add: function(tmdb, callback){
		
	},
	
	list: function(callback){
		var movieCollection = db.collection('movie');
		movieCollection.find({status: {$exists: true}}).toArray(callback);
	},	
	remove: function(tmdb, callback){
		var movieCollection = db.collection('movie');
		movieCollection.update({tmdb: tmdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	unmatched: function(){},
	match: function(){},
	watched: function(){},
	
	getArtwork: function(){},
	getUnmatched: function(){},
};
exports = module.exports = MovieData;