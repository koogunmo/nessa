var http	= require('http'),
	fs		= require('fs'),
	trakt	= require('nodetv-trakt');


var movieCollection = db.collection('movie');

var MovieData = {
	add: function(tmdb, callback){
		
	},
	
	list: function(callback){
		movieCollection.find({tmdb: {$exists: true}}).toArray(callback);
	},	
	
	remove: function(tmdb, callback){
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
	
	getArtwork: function(tmdb, callback){
		var self = this, tmdb = parseInt(tmdb, 10);
		movieCollection.findOne({tmdb: tmdb}, function(error, movie){
			if (error || !movie) return;
			userCollection.findOne({admin: true}, {trakt:1}, function(error, admin){
				if (error || !admin) return logger.error(error);
				trakt(admin.trakt).movie.summary(movie.tmdb, function(error, json){
					if (json.images.poster) {
						var src = json.images.poster.replace('.jpg', '-138.jpg');
						var poster = fs.createWriteStream(nconf.get('media:base') + nconf.get('media:movies:directory') + '/.artwork/' + movie.tmdb + '.jpg', {flags: 'w', mode: 0644});
						poster.on('error', function(e){
							logger.error(e);
						});
						var request = http.get(src, function(response){
							response.pipe(poster);
						});
					}
					if (typeof(callback) == 'function') callback(null, movie.tmdb);
				});
			});
		});
	},
	getUnmatched: function(){},
};
exports = module.exports = MovieData;