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
	
	get: function(path, callback) {
	//	if (!Trakt.settings.enabled) return;
		request({
			uri: 'http://api.trakt.tv/'+path+'/'+Trakt.settings.apikey,
			method: 'GET'
		}, function(error, req, response){
			if (error) {
				logger.error(error);
				return;
			}
			try {
				if (typeof(response) != 'object') response = JSON.parse(response);
				callback(response);
			} catch(e) {
				logger.error(e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	post: function(path, data, callback) {
	//	if (!Trakt.settings.enabled) return;
		request({
			uri: 'http://api.trakt.tv/'+path+'/'+Trakt.settings.apikey,
			json: data,
			method: 'POST'
		}, function(error, req, response){
			if (error) {
				logger.error(path + ': ' +error);
				return;
			}
			try {
				if (typeof(response) != 'object') response = JSON.parse(response);
				callback(response);
			} catch(e) {
				logger.error(path + ': ' + e.message);
			}
		}).auth(Trakt.settings.username, Trakt.password());
	},
	
	/*********************************/
	
	account: {
		test: function(){
			var payload = {};
			Trakt.post('account/test', payload, function(json){
				console.log(json);
			});
		}
	},
	
	/*********************************/
	
	calendar: {
		shows: function(callback){
			Trakt.get('calendar/shows.json', function(json){
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
			Trakt.post('show/checkin', payload, function(json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		
		episode: {
			library: function(tvdb, list, callback){
				// Add episode to library
				var payload = {
					tvdb_id: tvdb,
					episodes: list
				};
				/* list = {season: 1, episode: 1} */
				Trakt.post('show/episode/library', payload, function(json){
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
				Trakt.post('show/episode/seen', payload, function(json){
					if (typeof(callback) == 'function') callback(json);
				});
			}
		},
		
		library: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/library', payload, function(json){
				if (typeof(callback) == 'function') callback(json);
			});
		},
		
		season: {
			library: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/library', payload, function(json){
					if (typeof(callback) == 'function') callback(json);
				});
			},
			seen: function(tvdb, season, callback){
				var payload = {
					tvdb_id: tvdb,
					season: season
				};
				Trakt.post('show/season/seen', payload, function(json){
					if (typeof(callback) == 'function') callback(json);
				});
			}
		},
		seen: function(tvdb, callback){
			var payload = {
				tvdb_id: tvdb
			};
			Trakt.post('show/seen', payload, function(json){
				if (typeof(callback) == 'function') callback(json);
			});
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
			Trakt.post('show/watchlist', payload, function(json){
				if (typeof(callback) == 'function') callback(json);
			})
		}
	}
};

module.exports = exports = Trakt;