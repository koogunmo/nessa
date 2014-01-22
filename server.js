"use strict";
try{require('newrelic');}catch(e){}
/***********************************************************************/
/* Global Methods */

var log4js = require('log4js');
	log4js.replaceConsole();
var logger = global.logger = log4js.getLogger();
logger.setLevel('WARN');

var pkg = require('./package.json');

global.plugin = function(name){
	try {
		return require(__dirname + '/server/libs/' + name);
	} catch(e) {
		logger.error(e.message);
	}
	return false;
}

/* Load Settings */
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
		branch: 'master'
	}
});

if (process.cwd() != __dirname) {
	try {
		process.chdir(__dirname);
	} catch(e) {
		logger.error(e.message);
	}
}

/* Set a friendly process name */
if (process.title) process.title = 'NodeTV';

/***********************************************************************/
/* Load dependencies */

var connect	= require('connect'),
	express	= require('express'),
	fs		= require('fs'),
	path	= require('path'),
	uuid	= require('node-uuid');



var passport		= require('passport'),
	LocalStrategy	= require('passport-local').Strategy;

/* Global methods */
global.events = new (require('events')).EventEmitter;

logger.info(process.title + ' v'+pkg.version);

global.helper	= require('./server/core/helper');
global.torrent	= plugin('transmission');

global.trakt = plugin('trakt').init({
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
	app.use(app.router);
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
				var MongoStore = require('connect-mongo')(connect);
				app.use(express.session({
					secret: 'Correct Horse Battery Staple',
					store: new MongoStore({
						db: db
					})
				}));
				
				app.use(passport.initialize());
				app.use(passport.session());
				
				if (nconf.get('media:base') && !nconf.get('listen:nginx')){
					app.use('/media', express.static(nconf.get('media:base')));
				}
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
					console.log(data);
				});
				*/
			}
		});
	} else {
		nconf.set('installed', false);
		logger.warn('Waiting for install');
		
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
	
	socket.on('reconnected', function(data) {
		try {
			logger.info(data);
		} catch(e) {
			logger.error('Socket reconnect: ' + e.message);
		}
		
	}).on('disconnect', function(data){
		// User disconnected
		try {
			
		} catch(e) {
			logger.error('Socket disconnect: ' + e.message);
		}
	});
	
	events.on('system.alert', function(data){
		socket.emit('system.alert', {
			type: data.type,
			message: data.message
		});
	});
	
	/*	
	events.on('download.complete', function(data){
		socket.emit('system.alert', {
			type: 'info',
			message: data.show + ' S' + data.season + 'E'+ data.episode + ' downloaded'
		});
	});
	*/
	
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
		
	}).on('system.users', function(){
		var collection = db.collection('user');
		collection.find().toArray(function(error, results){
			if (error) return;
		//	socket.emit('system.users', rows);
		})
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
		var system = plugin('system');
		system.restart()
		
	}).on('system.update', function(){
		var system = plugin('system');
		system.update(function(){
			socket.emit('system.loaded');
		});
	});
	
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
			if (json && json.length) socket.emit('dashboard.unmatched', json.length);
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
	socket.on('download.list', function(){
		torrent.list(function(error, data){
			if (error) return;
			socket.emit('download.list', data.torrents);
		});
		
	}).on('download.remove', function(data){
		torrent.remove(data, function(error){
			if (!error) {
				socket.emit('system.alert', {
					type: 'success',
					message: 'Torrent successfully deleted',
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
		shows.getFullListings(tvdb, function(error, tvdb){
			shows.getHashes(tvdb);
		//	show.summary(data.id, function(error, json){
		//		socket.emit('show.summary', json);
		//	});
		});
	});
	
	// Trakt 'watched' functionality
	
	socket.on('show.watched', function(data){
		
		return;
		
		trakt.show.seen(data.tvdb, function(error, json){
			if (error) return;
			if (json.status == 'success') {
				var collection = db.collection('episode');
				collection.update({tvdb: data.tvdb}, {$set: {watched: true}}, function(error, affected){
					if (error) return;
				});
			}
		});
		
	}).on('show.season.watched', function(data){
		
		return;
		
		trakt.show.season.seen(data.tvdb, data.season, function(error, json){
			if (error) return;
			if (json.status == 'success') {
				var collection = db.collection('episode');
				collection.update({tvdb: data.tvdb, season: data.season}, {$set: {watched: true}}, function(error, affected){
					if (error) return;
				});
			}
		});
		
	}).on('show.episode.watched', function(data){
		if (data.watched) {
			trakt.show.episode.seen(data.tvdb, data.season, data.episode, function(error, json){
				if (error) return;
				if (json.status == 'success') {
					var collection = db.collection('episode');
					collection.update({tvdb: data.tvdb, season: data.season, episode: data.episode}, {$set: {watched: true}}, function(error, affected){
						if (error) return;
					});
				}
			});
		} else {
			trakt.show.episode.unseen(data.tvdb, data.season, data.episode, function(error, json){
				if (error) return;
				if (json.status == 'success') {
					var collection = db.collection('episode');
					collection.update({tvdb: data.tvdb, season: data.season, episode: data.episode}, {$set: {watched: false}}, function(error, affected){
						if (error) return;
					});
				}
			});
		}
	});
	
	socket.on('show.episode.download', function(data){
		var shows = plugin('showdata');
		shows.download(data.tvdb, data.season, data.episode);
	});
	
});

/***********************************************************************/
// Routing

app.get('/', function(req, res) {	
	res.sendfile(__dirname + '/app/views/index.html');
});

/* User Authentication */

passport.use(new LocalStrategy(
	function(username, password, done) {
		var sha1 = require('crypto').createHash('sha1');
		var pass = sha1.update(password).digest('hex');
		
		var collection = db.collection('user');
		collection.findOne({username: username, password: password}, function(error, user){
			if (error) return done(error);
			if (!user) return done(null, false, {message: 'Incorrect'});
			return done(null, user);
		});
	}
));
passport.serializeUser(function(user, done) {
	return done(null, user);
});
passport.deserializeUser(function(user, done) {
	return done(null, user);
});

app.get('/installed', function(req, res){
	var response = {
		installed: nconf.get('installed')
	};
	res.send(response);
});

app.get('/loggedin', function(req, res){
	var response = {
		authenticated: false,
		user: {}
	};
	if (nconf.get('security:whitelist')) {
		// Is there a list of allowed IPs?
		var blocks = nconf.get('security:whitelist').split(',');
		var netmask = require('netmask').Netmask;
		blocks.forEach(function(mask){
			var block = new netmask(mask);
			if (block.contains(req.connection.remoteAddress)) {
				response.authenticated = true;
			}
		});
		if (response.authenticated) return res.send(response);
	}
	var collection = db.collection('user');
	collection.count(function(error, count){
		if (!count) {
			response.authenticated = true;
		} else {
			if (req.isAuthenticated()) {
				response.authenticated = true;
				response.user = req.user;
			}
		}
		res.send(response);
	});
});
app.post('/login', passport.authenticate('local'), function(req, res){
	res.send(req.user);
});
app.post('/logout', function(req,res){
	req.logOut();
	res.send(200);
});