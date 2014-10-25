var fs			= require('fs'),
	http		= require('http'),
	log4js		= require('log4js'),
	ObjectID	= require('mongodb').ObjectID,
	trakt		= require('nodetv-trakt');

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
		// Retrive movie list from trakt
	},
	
	unmatched: function(callback){
		if (!callback) return;
	//	movieCollection.update({tmdb:{$exists:true},unmatched:{$exists:true}}, {$unset:{unmatched:true}}, {multi:true}, function(){
			movieCollection.find({tmdb: {$exists: false}, unmatched: {$exists: true}}).sort({title:1}).limit(50).toArray(callback);
	//	});
	},
	match: function(matched, callback){
		var self = this;
		try {
			for (var id in matched){
				movieCollection.findOne({'_id': ObjectID(id)}, function(error, movie){
					if (movie){
						var match = matched[movie._id];
						var record = {
							$set: {
								tmdb: parseInt(match.tmdb_id,10),
								imdb: match.imdb_id,
								year: parseInt(match.year,10),
								title: match.title,
								synopsis: match.overview,
								genres: match.genres							
							},
							$unset: {unmatched: true}
						};
						movieCollection.update({_id: ObjectID(movie._id)}, record, function(error, result){
							if (error) return logger.error(error);
							self.getArtwork(record.tmdb);
						});
					}
				});
			}
			if (typeof(callback) == 'function') callback(null);
		} catch(e){
			logger.error(e.message);
		}
	},
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