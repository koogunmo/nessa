var crypto	= require('crypto'),
	extend	= require('xtend'),
	request	= require('request');

var Trakt = {
	init: function(obj){
		this.settings = extend(this.settings, obj);
		return this;
	},
	settings: {
		enabled: true,
		username: null,
		password: null,
		apikey: null
	},
	
	/* Utility Methods */
	password: function() {
		try {
			return require('crypto').createHash('sha1').update(Trakt.settings.password).digest('hex');
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	get: function(url, data, callback) {
	//	if (!Trakt.settings.enabled) return;
		var path = (data) ? '/' + data.join('/') : '';
		request({
			uri: 'http://api.trakt.tv/'+url+'/'+Trakt.settings.apikey + path,
			method: 'GET'
		}, function(error, req, response){
			if (error) {
				logger.error(error);
				return;
			}
			try {
				if (typeof(response) != 'object') response = JSON.parse(response);
			//	var error = (response.status == 'success') ? false : true;
				callback(false, response);
			} catch(e) {
				logger.error(url+': '+e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	post: function(url, data, callback) {
	//	if (!Trakt.settings.enabled) return;
		request({
			uri: 'http://api.trakt.tv/'+url+'/'+Trakt.settings.apikey,
			json: data,
			method: 'POST'
		}, function(error, req, response){
			if (error) {
				logger.error(url+': '+error);
				return;
			}
			try {
				if (typeof(response) != 'object') response = JSON.parse(response);
				var error = null;
				if (response.status == 'failed') error = response.message;
				callback(error, response);
			} catch(e) {
				logger.error(url+': '+e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	/*********************************/
	
	account: {
		test: function(){
			var payload = {};
			Trakt.post('account/test', payload, function(error, json){
				console.log(json);
			});
		}
	},
	
	calendar: {
		shows: function(callback){
			Trakt.get('calendar/shows.json', null, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		}
	},
	
	/*********************************/
	
	movie: {
		library: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/library', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		seen: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/seen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		summary: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.get('movie/summary.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		unlibrary: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/unlibrary', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		unseen: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/unseen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		}
	},
	
	show: {
		checkin: function(){
			var payload = {
				tvdb_id: null,
				season: null,
				episode: null
			}
			Trakt.post('show/checkin', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		
		episode: {
			library: function(tvdb, list, callback){
				// Add episode to library
				/* list = {season: 1, episode: 1} */
				var payload = {
					tvdb_id: tvdb,
					episodes: list
				};
				Trakt.post('show/episode/library', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			seen: function(tvdb, season, episode, callback){
				// Mark episode as watched
				var payload = {
					tvdb_id: tvdb,
					episodes: [{
						season: season,
						episode: episode
					}]
				};
				Trakt.post('show/episode/seen', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			summary: function(tvdb, season, episode, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season,
					episode: episode
				};
				Trakt.get('show/episode/summary.json', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			unseen: function(tvdb, season, episode, callback){
				var payload = {
					tvdb_id: tvdb,
					episodes: [{
						season: season,
						episode: episode
						
					}]
				};
				Trakt.post('show/episode/unseen', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			}

		},
		
		library: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/library', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		
		season: {
			info: function(tvdb, season, callback){
				var payload = [tvdb, season];
				Trakt.get('show/season.json', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			library: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/library', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			seen: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/seen', payload, function(error, json){
					if (typeof(callback) == 'function') callback(json);
				});
			}
		},
		seasons: function(tvdb){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.get('show/seasons.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		seen: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/seen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		summary: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.get('show/summary.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		unlibrary: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/unlibrary', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			})
		
		},
		watchlist: function(shows, callback){
			var payload = {
				shows: []
			};
			if (typeof(shows) == 'object') {
				shows.forEach(function(k,v){
					payload.shows.push({
						tvdb_id: k
					});
				});
			} else {
				payload.shows.push(shows)
			}
			Trakt.post('show/watchlist', payload, function(error, json){
				if (typeof(callback) == 'function') callback(json);
			})
		}
	}
};

module.exports = exports = Trakt;