var MovieData = {
	add: function(tmdb, callback){
		
	},
	
	list: function(callback){
		var movieCollection = db.collection('movie');
		movieCollection.find({}).toArray(callback);
		
	},	
	
	
	remove: function(tmdb, callback){
		var movieCollection = db.collection('movie');
		movieCollection.update({tmdb: tmdb}, {$unset: {status: true}}, {upsert: true}, callback);
	},
	
	scan: function(){
		// Read movies directory, add to DB
	},
	
	sync: function(user, callback){
		// Pull movie list from 
	},
	
	unmatched: function(){},
	match: function(){},
	watched: function(){},
	
	getArtwork: function(){},
	getUnmatched: function(){},
};
exports = module.exports = MovieData;