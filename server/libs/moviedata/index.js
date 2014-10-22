var fs		= require('fs'),
	http	= require('http'),
	log4js	= require('log4js'),
	trakt	= require('nodetv-trakt');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-moviedata');


var movieCollection = db.collection('movie'),
	userCollection = db.collection('user');

var MovieData = {
	add: function(tmdb, callback){
		
	},
	
	list: function(callback){
		movieCollection.find({status: true, tmdb: {$exists: true}}).toArray(callback);
	},	
	
	remove: function(tmdb, callback){
		movieCollection.update({tmdb: tmdb}, {$set: {status: false}}, {upsert: true}, callback);
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
	
	getUnmatched: function(callback){
		movieCollection.find({unmatched: {$exists: true}}).toArray(function(error, movies){
			if (typeof(callback) == 'function') callback(error, movies);
		});
	},
};
exports = module.exports = MovieData;