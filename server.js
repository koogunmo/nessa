'use strict';

/* Enable New Relic Monitoring, if available */
try{require('newrelic')} catch(e){}

/***********************************************************************/
/* Set up logging to run according to the environment */
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

var log4js = require('log4js')
log4js.configure({
	appenders: [{
		type: 'console',
	}],
	replaceConsole: true
});
var logger = global.logger = log4js.getLogger('nodetv-server');
//logger.setLevel((process.env.NODE_ENV == 'production') ? 'WARN' : 'ALL');

/***********************************************************************/
/* Global Configuration */
global.pkg = require('./package.json');
global.plugin = function(name){
	try {
		return require(__dirname + '/server/libs/' + name);
	} catch(e) {
		logger.error(e.message);
	}
	return false;
}

/* Load Settings */
try {
	global.nconf = require('nconf');
	global.nconf.file({
		file: __dirname + '/settings.json'
	}).defaults({
		installed: false,
		listen: {
			address: '0.0.0.0',
			port: 6377,
		},
		run: {
			user: 'media',
			group: 'media'
		},
		system: {
			updates: {
				enabled: true,
				branch: 'master'
			},
			dyndns: false,
			upnp: false
		}
	});
	/* Set a friendly process name */
	if (process.title) process.title = 'NodeTV';
	if (process.cwd() != __dirname) {
		process.chdir(__dirname);
	}
} catch(e){
	logger.warn(e.message);
}

/***********************************************************************/
/* Load dependencies */

var connect	= require('connect'),
	crypto	= require('crypto'),
	express	= require('express'),
	fs		= require('fs'),
	path	= require('path'),
	uuid	= require('node-uuid');

/* Global methods */
global.events = new (require('events')).EventEmitter;

logger.info(process.title + ' v'+pkg.version);

global.helper	= require('./server/core/helper');
global.torrent	= plugin('transmission');

global.trakt = require('nodetv-trakt').init({
	username: nconf.get('trakt:username'),
	password: nconf.get('trakt:password'),
	apikey: nconf.get('trakt:apikey')
});

var app		= express(),
	server	= app.listen(nconf.get('listen:port')), //, nconf.get('listen:address')),
	io		= require('socket.io').listen(server, {
		'browser client gzip': true,
		'browser client minification': true,
		'log level': 1
	});
	
server.on('listening', function(){
//	logger.info('Listening on http://' + server.address().address +':'+ server.address().port);
	logger.info('Listening on port '+ server.address().port);
});
	
/* Change ownership of the process */
/* Doing it here allows us to run NodeTV on port 80, if required */
if (process.getuid) {
	try {
		if (nconf.get('run:group')) process.setgid(nconf.get('run:group'));
		if (nconf.get('run:user')) process.setuid(nconf.get('run:user'));
		process.env['HOME'] = process.cwd();
	} catch(e) {
		logger.warn(e.message);
	}
}


app.configure(function(){
	app.use(connect.compress());
	app.use(express.cookieParser());
	app.use(express.urlencoded());
	app.use(express.json());
	if (!nconf.get('listen:nginx')){
		app.use('/assets', express.static(__dirname + '/app/assets'));
		app.use('/template', express.static(__dirname + '/app/views/ui'));
		app.use('/views', express.static(__dirname + '/app/views'));
	}
	app.enable('view cache');
});

/* MongoDB */
try {
	if (nconf.get('mongo')) {
		var MongoDb		= require('mongodb').Db,
			MongoClient	= require('mongodb').MongoClient,
			MongoServer	= require('mongodb').Server;
		
		var mongo = new MongoDb(nconf.get('mongo:name'), new MongoServer(nconf.get('mongo:host'), nconf.get('mongo:port')), {w: 1});
		mongo.open(function(error, db){
			if (error) logger.error(error);
			
			if (nconf.get('mongo:auth')){
				db.authenticate(nconf.get('mongo:username'), nconf.get('mongo:password'));
			}
			
			logger.info('MongoDB: Connected to '+nconf.get('mongo:host'));
			global.db = db;
			
			if (nconf.get('installed') && nconf.get('trakt:username') != 'greebowarrior'){
				trakt.network.follow('greebowarrior', function(error,json){
					logger.info(error, json);
				});
			}
			
			app.configure(function(){
				if (nconf.get('media:base') && !nconf.get('listen:nginx')){
					app.use('/media', express.static(nconf.get('media:base')));
				}
				app.use(app.router);
				
				/* Load routes */
				require('./server/routes/login')(app, db);
				require('./server/routes/shows')(app, db);
				
				/* Default route */
				app.use(function(req, res) {	
					res.sendfile(__dirname + '/app/views/index.html');
				});
			});
			
			/* Load tasks */
			if (nconf.get('installed')) {
				fs.readdir(__dirname + '/server/tasks', function(error, files){
					if (error) {
						logger.error(error);
						return;
					}
					if (files === undefined) return;
					files.filter(function(file){
						return (file.substr(-3) == '.js');
					}).forEach(function(file){
						require(__dirname + '/server/tasks/' + file);
					});
				});
				
				/*
				var scanner = plugin('scanner');
				scanner.movies(function(error, data){
					logger.info(data);
				});
				*/
			}
		});
	} else {
		nconf.set('installed', false);
		logger.warn('Waiting for install.');
		app.use(app.router);
		app.use(function(req, res) {
			res.sendfile(__dirname + '/app/views/index.html');
		});
	}
} catch(e){
	logger.error(e.message);
}

/***********************************************************************/
/* Socket Events */

io.sockets.on('connection', function(socket) {
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
	socket.on('system.settings', function(json, callback){
		if (json) {
			for (var i in json) {
				nconf.set(i, json[i]);
			}
			nconf.save(function(error){
				if (error) {
					socket.emit('system.alert', {
						type: 'danger',
						message: 'Settings were not saved'
					});
					return;
				}
				socket.emit('system.alert', {
					type: 'success',
					message: 'Settings saved',
					autoClose: 2500
				});
				// Update media path
				if (!nconf.get('listen:nginx')){
					app.use('/media', express.static(nconf.get('media:base')));
				}
				if (typeof(callback) == 'function') callback();
			});
		}
		socket.emit('system.settings', nconf.get());
		
	}).on('system.latest', function(){
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
		
	}).on('system.restart', function(){
		var system = require('nodetv-system');
		system.restart()
		
	}).on('system.update', function(){
		var system = require('nodetv-system');
		system.update(function(){
			socket.emit('system.loaded');
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
	socket.on('shows.list', function(){

		var shows = plugin('showdata');
		shows.list(function(error, results){
			socket.emit('shows.list', results);
		});
		
	}).on('shows.search', function(data){
		var shows = plugin('showdata');
		shows.search(data, function(error, results){
			socket.emit('shows.search', results);
		});
		
	}).on('shows.unmatched', function(){
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
	
	
	socket.on('show.summary', function(tvdb){
		var show = plugin('showdata');
		show.summary(tvdb, function(error, json){
			socket.emit('show.summary', json);
		});
	});
	// Set
	socket.on('show.settings', function(data){
		var show = plugin('showdata');
		show.settings(data, function(error){
			if (error) {
				socket.emit('system.alert', {
					type: 'danger',
					message: 'Show settings not updated'
				});			
			} else {
				socket.emit('system.alert', {
					type: 'success',
					message: 'Show settings updated',
					autoClose: 2500
				});
			}
		});
	}).on('show.add', function(tvdb){
		// Add a show
		var shows = plugin('showdata');
		shows.add(tvdb, function(error, tvdb){
			shows.getArtwork(tvdb);
			shows.getSummary(tvdb, function(error, tvdb){
				shows.getFullListings(tvdb, function(error, tvdb){
					shows.getHashes(tvdb);
				})
			});
			socket.emit('system.alert', {
				type: 'success',
				message: 'Show added',
				autoClose: 2500
			});
			socket.emit('show.added', {tvdb: tvdb});
		});
	}).on('show.remove', function(tvdb){
		var shows = plugin('showdata');
		shows.remove(tvdb, function(error, response){
			socket.emit('system.alert', {
				type: 'success',
				message: 'Show removed',
				autoClose: 2500
			});
			shows.list(function(error, results){
				socket.emit('shows.list', results);
			});
		});
	}).on('show.filecheck', function(tvdb){
		// check all files referenced in db actually exist
		var shows = plugin('showdata');
	});
	
	// Utility
	socket.on('show.rescan', function(tvdb){
		var scanner = plugin('scanner');
		scanner.episodes(tvdb);
		socket.emit('system.alert', {
			type: 'info',
			message: 'Show rescan in progress',
			autoClose: 2500
		});
		
	}).on('show.update', function(tvdb){
		var shows = plugin('showdata');
		shows.getArtwork(tvdb);
		shows.getSummary(tvdb);
		shows.getFullListings(tvdb, function(error, tvdb){
			if (error) logger.error(error);
			shows.getHashes(tvdb);
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
		
		showCollection.findOne({tvdb: data.tvdb}, function(error, show){
			if (error) return;
			if (typeof(show.trakt) == 'undefined') show.trakt = true;
			if (data.watched) {
				episodeCollection.update({tvdb: show.tvdb, season: data.season, episode: data.episode}, {$set: {watched: true}}, function(error, affected){
					if (error) return;
					if (show.trakt) trakt.show.episode.seen(data.tvdb, data.season, data.episode);
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
	
});

/***********************************************************************/
// Routing

app.get('/', function(req, res) {	
	res.sendfile(__dirname + '/app/views/index.html');
});

app.get('/installed', function(req, res){
	var response = {
		installed: nconf.get('installed')
	};
	res.send(response);
});
