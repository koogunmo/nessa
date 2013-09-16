/***********************************************************************/
/* Global Methods */

global.plugin = function(name){
	try {
		return require('./libs/' + name);
	} catch(e) {
		logger.error(e.message);
	}
	return false;
}

/* Load Settings */
global.nconf = require('nconf').defaults({
	port: 6377,
	installed: true,
	run: {
		user: 'media',
		group: 'media'
	}
}).file({file: 'settings.json'});

/* Change ownership of the process */
if (process.getuid) {
	try {
		if (nconf.get('run:group')) process.setgid(nconf.get('run:group'));
		if (nconf.get('run:user')) process.setuid(nconf.get('run:user'));
		process.env['HOME'] = process.cwd();
	} catch(e) {
		console.error(e.message);
	}
}

/* Set a friendly process name */
if (process.title) process.title = 'nessa.js';

/***********************************************************************/
/* Load dependencies */

var extend	= require('xtend'),
	express	= require('express'),
	fs		= require('fs'),
	http	= require('http'),
	logger	= require('log4js').getLogger(),
	mime	= require('mime'),
	path	= require('path'),
	request	= require('request'),
	sqlite	= require('sqlite3').verbose(),
	sys		= require('sys'),
	tvdb	= new (require('tvdb'))({apiKey: nconf.get('tvdb:apikey')}),
	url		= require('url'),
	util	= require('util'),
	uuid	= require('node-uuid'),
	
	xml2js	= new (require('xml2js')).Parser();

var passport		= require('passport'),
	LocalStrategy	= require('passport-local').Strategy;

/* Global methods */
global.events = new (require('events')).EventEmitter;
global.logger = logger;

global.helper	= require('./core/helper');
global.torrent	= plugin('transmission');

global.trakt = plugin('trakt').init({
	username: nconf.get('trakt:username'),
	password: nconf.get('trakt:password'),
	apikey: nconf.get('trakt:apikey')
});

var app		= express(),
	server	= app.listen(nconf.get('port')),
	io		= require('socket.io').listen(server);

app.configure(function(){
	app.use('/assets', express.static(__dirname + '/assets'));
	app.use('/media', express.static(nconf.get('shows:base')));
	app.use('/views', express.static(__dirname + '/views'));
	
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({secret: 'correct horse battery staple'}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
});

logger.info('nessa.js: Listening on port ' + nconf.get('port'));

/* Database */
if (!fs.existsSync('db/nessa.sqlite')) {
	nconf.set('installed', false);
	global.db = new sqlite.Database(__dirname + '/db/nessa.sqlite', function(error){
		if (error) logger.error('DB: ', error);
	});
	fs.readFile('db/create.sql', 'utf8', function(error, sql){
		if (error) throw(error);
		db.exec(sql, function(error){
			if (error) throw(error);
		});
		db.close();
	});
}
global.db = new sqlite.Database(__dirname + '/db/nessa.sqlite', function(error){
	if (error) logger.error('DB: ', error);
});

/***********************************************************************/
/* Handle events */

events.on('shows.list', function(error, response){
	if (response) {
		var scanner = plugin('scanner');
		scanner.shows();
	}
}).on('scanner.shows', function(error, id){
	var shows = plugin('showdata');
	shows.info(id);
	
	if (!error) shows.match();
	
}).on('shows.info', function(error, id){
	var shows = plugin('showdata');
	shows.episodes(id);
	shows.artwork(id);
	
}).on('shows.episodes', function(error, id){
	var scanner = plugin('scanner');
	scanner.episodes(id);
	
});

/***********************************************************************/
/* Load tasks */
fs.readdir(__dirname + '/core/tasks', function(error, files){
	if (error) {
		logger.error(error);
		return;
	}
	if (files === undefined) return;
	files.filter(function(file){
		return (file.substr(-3) == '.js');
	}).forEach(function(file){
		require(__dirname + '/core/tasks/' + file);
	});
});

/***********************************************************************/
/* Socket Events */


io.configure(function(){
	io.set('log level', 1);
	io.enable('browser client minification');
	io.enable('browser client gzip');
});

io.sockets.on('connection', function(socket) {
	try {
		var sessionid	= uuid.v4();
		logger.info('New connection (' + socket.transport + ') ' + sessionid);
		
		
	} catch(e) {
		logger.error('connection: ' + e.message);
	}
	
	socket.on('reconnected', function(data) {
		try {
			console.log(data);
		} catch(e) {
			logger.error('reconnected: ' + e.message);
		}
	}).on('disconnect', function(data){
		// User disconnected
		try {
			
		} catch(e) {
			logger.error('disconnect: ' + e.message);
		}
	});
	
	
	/* System handlers */
	socket.on('system.update', function(data){
		// Force an update from github (if one is available)
		socket.emit('system.loading', {message: 'Updating...'});
		
		var system = plugin('system');
		system.update(function(){
			socket.emit('system.loaded');
		});
		
	}).on('system.rescan', function(){
		var scanner = plugin('scanner');
		
		scanner.shows();
		
	}).on('system.restart', function(data){
		// Restart the process, NOT the server
		socket.emit('system.loading', {message: 'Restarting...'});
		var system = plugin('system');
		
		system.restart()
	});
	
	
	/* Page handlers */
	
	socket.on('main.dashboard', function(){
		// Latest downloads
		db.all("SELECT S.name, E.season, E.episode, E.title, E.synopsis, E.airdate FROM show AS S INNER JOIN show_episode AS E ON S.id = E.show_id ORDER BY downloaded DESC LIMIT 10", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('page.template', {
				template: 'views/main/dashboard.html',
				data: {
					latest: rows
				}
			});
		});
		
		
	}).on('main.settings', function(){
		socket.emit('page.template', {
			template: 'views/main/settings.html',
			data: nconf.get()
		});
		
	}).on('shows.enabled', function(){
		// List of enabled/subscribed shows
		var shows = plugin('showdata');
		shows.enabled(function(json){
			socket.emit('page.template', {
				template: 'views/show/list.html',
				data: {
					shows: json
				}
			});
		});
	});
	
	
	/***************************************************/
	/* "API" calls */
	
	socket.on('settings.save', function(settings){
		var qs = require('querystring');
		var json = qs.parse(settings);
		
		for (var i in json) {
			nconf.set(i, json[i]);
		}
		nconf.save();
	});
	
	socket.on('show.add', function(id){
		// Add a show
		var shows = plugin('showdata');
		shows.add(id, function(){
			socket.emit('page.reload');
		});
		
	}).on('show.disable', function(data){
		var show = plugin('showdata');
		show.disable(data.id, function(json){
			
		});
	});
	
	/* List shows */
	socket.on('shows.unmatched', function(){
		var shows = plugin('showdata');
		shows.unmatched(function(json){
			socket.emit('shows.unmatched', json);
		});
	}).on('shows.match', function(data){
		var qs = require('querystring');
		var match = qs.parse(data);
		try {
			var shows = plugin('showdata');
			for (var id in match) {
				shows.match(id, match[id]);
			}
		} catch(e) {
			logger.error(e.message);
		}
	});
	
	/* Individual show data */
	socket.on('show.overview', function(id){
		// Fetch individual show details
		var show = plugin('showdata');
		show.overview(id, function(json){
			socket.emit('modal.template', {
				template: 'views/show/info.html',
				data: json
			});
		});
		
	}).on('show.rescan', function(data){
		var scanner = plugin('scanner');
		scanner.episodes(data.id);
		
	}).on('show.settings', function(data){
		var qs = require('querystring');
		var show = plugin('showdata');
		
		var json = qs.parse(data);
		show.settings(data, function(json){
			
		});
	}).on('show.update', function(data){
		var show = plugin('showdata');
		show.info(data.id);
	});
	
	// Search
	socket.on('show.search', function(data){
		var shows = plugin('showdata');
		shows.search(data, function(results){
			socket.emit('show.search', {shows: results});
		});
	});
	
});

/***********************************************************************/
// Routing
/*
trakt.calendar.shows(function(json){
	var upcoming = [];
	json.forEach(function(day){
		upcoming[day.date] = [];
		day.episodes.forEach(function(show){
			if (!show.show.in_watchlist) return;
			var record = {
				tvdb: show.show.tvdb_id,
				season: show.episode.season,
				episode: show.episode.number
			};
			upcoming[day.date].push(record);
		});
	});
	console.log(upcoming);
});
*/

app.get('/', ensureAuthenticated, function(req, res) {	
	res.sendfile('views/index.html');
});

// Authentication
passport.use(new LocalStrategy(
	function(username, password, done) {
		var sha1 = require('crypto').createHash('sha1');
		var pass = sha1.update(password).digest('hex');
		
		db.get("SELECT * FROM user WHERE username = ? AND password = ?", username, pass, function(error, user){
			if (error) return done(error);
			if (!user) return done(null, false, {message: 'Incorrect'});
			return done(null, user);
		});
	}
));


passport.serializeUser(function(user, done) {
	return done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	db.get("SELECT * FROM user WHERE id = ?", id, function(error, user){
		if (error) return done(error);
		return done(null, user);
	});
});

function ensureAuthenticated(req, res, next) {
	
	var allowed	= false;
	if (nconf.get('security:whitelist')) {
		var blocks = nconf.get('security:whitelist').split(',');
		
		console.log(blocks);
	}
	
	if (blocks) {
		var netmask = require('netmask').Netmask;
		blocks.forEach(function(mask){
			var block = new netmask(mask);
			if (block.contains(req.connection.remoteAddress)) {
				allowed = true;
			}
		});
	}
	if (req.isAuthenticated()) allowed = true;
	if (allowed) {
		next();
	} else {
		res.redirect('/login');
	}
}

app.get('/login',  function(req, res){
	res.sendfile('views/login.html');
});

app.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login'
}));


// Below is a chaotic mess of ideas and prototyping

/*
app.get('/install', function(req, res){
	var shows = plugin('showdata');
	shows.list(true);
	res.end('Building database');
});
app.get('/info/:show', function(req, res){
	var shows = plugin('showdata');
	shows.info(req.params.show);
	
});
app.get('/episodes/:show', function(req, res){
	var shows = plugin('showdata');
	shows.episodes(req.params.show);
	
});
*/

/*
// Magnet parser test
var magnet = 'magnet:?xt=urn:btih:60800347c8346ebb16b192290194d64dbe560b0a&dn=Continuum+S02E12+720p+HDTV+x264-KILLERS+%5Beztv%5D&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337';
console.log(helper.formatMagnet(magnet));
*/