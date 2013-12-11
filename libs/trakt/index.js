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
		if (typeof(data) == 'object') {
			var array = [];
			for (var i in data) array.push(data[i]);
			data = array;
		}
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
				if (typeof(callback) == 'function') callback(null, response);
			} catch(e) {
				logger.error(url+': '+e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	post: function(url, data, callback) {
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
				if (typeof(callback) == 'function') callback(null, response);
			} catch(e) {
				logger.error(url+': '+e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	search: function(type, query, callback){
		request({
			uri: 'http://api.trakt.tv/search/'+type+'.json/'+Trakt.settings.apikey + '?limit=10&query=' + query,
			method: 'GET'
		}, function(error, req, response){
			if (error) {
				logger.error(error);
				return;
			}
			try {
				if (typeof(response) != 'object') response = JSON.parse(response);
			//	var error = (response.status == 'success') ? false : true;
				if (typeof(callback) == 'function') callback(null, response);
			} catch(e) {
				logger.error('search/'+type+': '+e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	/*********************************/
	
	account: {
		test: function(callback){
			var payload = {};
			Trakt.post('account/test', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		}
	},
	
	calendar: {
		shows: function(callback){
			Trakt.get('calendar/shows.json', null, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
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
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		seen: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/seen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		summary: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.get('movie/summary.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		unlibrary: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/unlibrary', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		unseen: function(imdb, callback){
			var payload = {
				imdb_id: imdb
			};
			Trakt.post('movie/unseen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		}
	},
	
	network: {
		follow: function(user, callback){
			var payload = {
				user: user
			};
			Trakt.post('network/follow', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
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
				if (typeof(callback) == 'function') callback(error, json);
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
					if (typeof(callback) == 'function') callback(error, json);
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
					if (typeof(callback) == 'function') callback(error, json);
				});
			},
			summary: function(tvdb, season, episode, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season,
					episode: episode
				};
				Trakt.get('show/episode/summary.json', payload, function(error, json){
					if (typeof(callback) == 'function') callback(error, json);
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
					if (typeof(callback) == 'function') callback(error, json);
				});
			}

		},
		
		library: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/library', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		
		season: {
			info: function(tvdb, season, callback){
				var payload = [tvdb, season];
				Trakt.get('show/season.json', payload, function(error, json){
					if (typeof(callback) == 'function') callback(error, json);
				});
			},
			library: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/library', payload, function(error, json){
					if (typeof(callback) == 'function') callback(error, json);
				});
			},
			seen: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/seen', payload, function(error, json){
					if (typeof(callback) == 'function') callback(error, json);
				});
			}
		},
		seasons: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.get('show/seasons.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		seen: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/seen', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		summary: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.get('show/summary.json', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
			});
		},
		unlibrary: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/unlibrary', payload, function(error, json){
				if (typeof(callback) == 'function') callback(error, json);
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
				if (typeof(callback) == 'function') callback(error, json);
			})
		}
	}
};

module.exports = exports = Trakt;