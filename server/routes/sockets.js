module.exports = function(app,db,socket){
	var uuid	= require('node-uuid');
	
	try {
		var sessionid	= uuid.v4();
		logger.info('New connection (' + socket.transport + ') ' + sessionid);
	} catch(e) {
		logger.error('Socket Connection: ' + e.message);
	}
	
	var eventAlerts = function(data){
		socket.emit('system.alert', {
			type: data.type,
			message: data.message
		});
	};
	
	events.on('system.alert', eventAlerts);
	socket.on('reconnected', function(data) {
		try {
			logger.info(data);
		} catch(e) {
			logger.error('Socket reconnect: ' + e.message);
		}
		
	}).on('disconnect', function(data){
		// User disconnected
		try {
			if (eventAlerts) events.removeListener('system.alert', eventAlerts);
		} catch(e) {
			logger.error('Socket disconnect: ' + e.message);
		}
	});
	
	/*************** New Socket methods ***************/
	
	// System
	socket.on('system.latest', function(){
		var shows = plugin('showdata');
		shows.getLatest();
		socket.emit('system.alert', {
			type: 'info',
			message: 'Checking for new downloads',
			autoClose: 2500
		});
		
	}).on('system.listings', function(){
		// Update ALL listing information and artwork
		var shows = plugin('showdata');
		var showCollection = db.collection('show');
		showCollection.find({status: {$exists: true}}).toArray(function(error, results){
			results.forEach(function(show){
				shows.getArtwork(show.tvdb);
				shows.getProgress(show.tvdb);
				shows.getFullListings(show.tvdb, function(error, tvdb){
					shows.getHashes(show.tvdb);
				});
			});
		});
		
	}).on('system.rescan', function(){
		socket.emit('system.alert', {
			type: 'info',
			message: 'Rescanning media directory',
			autoClose: 2500
		});
		
		var scanner = plugin('scanner');
		var shows = plugin('showdata');
		
		scanner.shows(function(error, tvdb){
			shows.getFullListings(tvdb, function(error, tvdb){
				shows.getHashes(tvdb);
				scanner.episodes(tvdb);
			});
		});
		
	});
	
	// User
	
	socket.on('system.users', function(){
		var sysUser = plugin('user');
		sysUser.list(function(error, json){
			socket.emit('system.users', json);
		});
		
	}).on('system.user', function(id){
		var sysUser = plugin('user');
		sysUser.get(id, function(error, json){
			socket.emit('system.user', json);
		});
		
	}).on('system.user.update', function(data){
		var sysUser = plugin('user');
		sysUser.update(data, function(error, json){
			sysUser.list(function(error, json){
				socket.emit('system.users', json);
			});
		});
		
	}).on('system.user.remove', function(id){
		var sysUser = plugin('user');
		sysUser.remove(id, function(error, json){
			sysUser.list(function(error, json){
				socket.emit('system.users', json);
			});
		});
	})
		
	
	socket.on('media.settings', function(){
		socket.emit('media.settings', nconf.get('media'));
	});
	
	/** Dashboard **/
	socket.on('dashboard', function(){
		var shows = plugin('showdata');
		
		// List latest downloads
		shows.latest(function(error, json){
			socket.emit('dashboard.latest', json);
		});
		
		// Check for unmatched shows
		shows.getUnmatched(function(error, json){
			if (!error && json && json.length) socket.emit('dashboard.unmatched', json.length);
		});
		
		// Get upcoming shows
		trakt.calendar.shows(function(error, json){
			socket.emit('dashboard.upcoming', json);
		});
		
		// Generate some stats/info for the homepage
		socket.emit('dashboard.stats', {
			version: pkg.version,
			uptime: process.uptime()
		});
	});

	/** Downloads **/
//	socket.on('download.list', function(){
		var sendList = setInterval(function(){
			torrent.list(function(error, data){
				if (error) return;
				socket.emit('download.list', data.torrents);
			});
		}, 1000);
//	});
	
	socket.on('download.info', function(id){
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		torrent.info(parseInt(id, 10), function(error, data){
			try {
				var torrent = data.torrents[0];
				var response = {
					id: torrent.id,
					status: !!torrent.status,
					hash: torrent.hashString,
					date: {
						started: torrent.addedDate
					},
				};
				episodeCollection.findOne({hash: torrent.hashString.toUpperCase()}, function(error, results){
					if (results) {
						// In DB, no manual move required
						response.episode = results;
						showCollection.findOne({tvdb: results.tvdb}, function(error, show){
							response.show = show;
							socket.emit('download.info', response);
						});
					} else {
						response.files = [];
						torrent.files.forEach(function(file){
							response.files.push(file);
						});
						socket.emit('download.info', response);
					}
				});
			} catch(e){
				logger.error(e.message);
			}
		});
		
	}).on('download.remove', function(data){
		torrent.remove(data, function(error){
			if (!error) {
				socket.emit('system.alert', {
					type: 'success',
					message: 'Torrent deleted',
					autoClose: 2500
				});
				torrent.list(function(error, data){
					if (error) return;
					socket.emit('download.list', data.torrents);
				});
			}
		});
	}).on('download.start', function(id){
		torrent.start(id, function(error, args){});
	}).on('download.stop', function(id){
		torrent.stop(id, function(error, args){});
	}).on('download.url', function(url){
		torrent.add(url, function(error, data){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('system.alert', {
				type: 'success',
				message: 'Torrent added',
				autoClose: 1500
			});
		});
	});
	
	/** Movies **/
	socket.on('movies.list', function(){
		var movies = plugin('moviedata');
		movies.list(function(error, results){
			socket.emit('movies.list', results);
		})
	});
	
	
	/** Shows **/
	socket.on('shows.unmatched', function(){
		var shows = plugin('showdata');
		shows.unmatched(function(error, json){
			socket.emit('shows.unmatched', json);
		});
		
	}).on('shows.matched', function(data){
		var shows = plugin('showdata');
		var scanner = plugin('scanner');
		
		shows.match(data, function(error, tvdb){
			shows.getSummary(tvdb, function(error, tvdb){
				shows.getArtwork(tvdb);
				shows.getFullListings(tvdb, function(error, tvdb){
					shows.getHashes(tvdb)
					scanner.episodes(tvdb);
				});
			});
		});
	}).on('shows.unwatched', function(data){
		var shows = plugin('showdata');
		shows.getUnwatched(function(error, json){
			if (error) logger.error(error);
			logger.log(json);
		});
	});
	
	// Trakt 'watched' functionality
	
	socket.on('show.watched', function(data){
		return;
		
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		showCollection.findOne({tvdb: data.tvdb}, function(error, show){
			if (error) return;
			if (typeof(show.trakt) == 'undefined') show.trakt = true;
			episodeCollection.update({tvdb: data.tvdb}, {$set: {watched: true}}, function(error, affected){
				if (error) return;
				trakt.show.seen(data.tvdb);
			});
		});
	}).on('show.season.watched', function(data){
		return;
		
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		showCollection.findOne({tvdb: data.tvdb}, function(error, show){
			if (error) return;
			if (typeof(show.trakt) == 'undefined') show.trakt = true;
			episodeCollection.update({tvdb: data.tvdb, season: data.season}, {$set: {watched: true}}, function(error, affected){
				if (error) return;
				if (show.trakt) trakt.show.season.seen(data.tvdb, data.season);
			});
		});
		
	}).on('show.episode.watched', function(data){
		var showCollection = db.collection('show');
		var episodeCollection = db.collection('episode');
		
		showCollection.findOne({tvdb: parseInt(data.tvdb, 10)}, function(error, show){
			if (error) return;
			if (typeof(show.trakt) == 'undefined') show.trakt = true;
			if (data.watched) {
				episodeCollection.update({tvdb: show.tvdb, season: data.season, episode: data.episode}, {$set: {watched: true}}, function(error, affected){
					if (error) return;
					if (show.trakt) {
						trakt.show.episode.seen(data.tvdb, data.season, data.episode);
					}
				});
			} else {
				episodeCollection.update({tvdb: show.tvdb, season: data.season, episode: data.episode}, {$set: {watched: false}}, function(error, affected){
					if (error) return;
					if (show.trakt) trakt.show.episode.unseen(data.tvdb, data.season, data.episode);
				});
			}
		});
	});
	
	socket.on('show.download', function(data){
		// Download all available episodes
		var shows = plugin('showdata');
		var episodeCollection = db.collection('episode');

		episodeCollection.find({tvdb: data.tvdb, hash: {$exists: true}, file: {$exists: false}}).toArray(function(error, results){
			if (error) return;
			results.forEach(function(result){
				shows.download(result.tvdb, result.season, result.episode);
			});
		});
		
	}).on('show.season.download', function(data){
		// Download all available episodes for a given season
		var shows = plugin('showdata');
		var episodeCollection = db.collection('episode');
		
		episodeCollection.find({tvdb: data.tvdb, season: parseInt(data.season, 10), hash: {$exists: true}, file: {$exists: false}}).toArray(function(error, results){
			if (error) return;
			results.forEach(function(result){
				shows.download(result.tvdb, result.season, result.episode);
			});
		});
		
	}).on('show.episode.download', function(data){
		var shows = plugin('showdata');
		var episodeCollection = db.collection('episode');
		
		shows.download(data.tvdb, data.season, data.episode);
	});	
};
