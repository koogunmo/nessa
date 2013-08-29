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
	run: {
		user: 'media',
		group: 'media'
	}
}).file({file: 'settings.json'});

/* Change ownership of the process */
if (process.getuid && process.getuid) {
	try {
		if (nconf.get('run:group')) process.setgid(nconf.get('run:group'));
		if (nconf.get('run:user')) process.setuid(nconf.get('run:user'));
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

/* Global methods */
global.events = new (require('events')).EventEmitter;
global.logger = logger;

global.helper	= require('./core/helper');
global.torrent	= plugin('transmission');

var app		= express(),
	server	= app.listen(nconf.get('port')),
	io		= require('socket.io').listen(server);

app.use('/assets', express.static(__dirname + '/assets'));
app.use('/views', express.static(__dirname + '/views'));
app.use(express.bodyParser());

logger.info('nessa.js: Listening on port ' + nconf.get('port'));

/* Database */
if (!fs.existsSync('db/nessa.sqlite')) {
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

// TO DO: Improve Transmission connection handling
torrent.connect();

/***********************************************************************/
/* Handle events */

events.on('shows.list', function(error, id){
	var scanner = plugin('scanner');
	scanner.shows(id);
	
}).on('scanner.shows', function(error, id){
	var shows = plugin('showdata');
	shows.info(id);
	
	if (!error) shows.match();
	
}).on('shows.info', function(error, id){
	var shows = plugin('showdata');
	shows.episodes(id);
	
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
	
	
	/* List shows */
	socket.on('shows.available', function(){
		// List of all shows
		db.all("SELECT * FROM show WHERE status >= 0 ORDER BY name ASC", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('shows.list', rows);
		});
	}).on('shows.enabled', function(data){
		// List of enabled/subscribed shows
		db.all("SELECT * FROM show WHERE status = 1 ORDER BY name ASC", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('shows.list', {shows: rows});
		});
	});
	
	/* Individual show data */
	socket.on('show.info', function(data){
		// Fetch individual show details
		db.get("SELECT * FROM show WHERE id = ?", data.show, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('show', row);
		});
	}).on('show.add', function(data){
		// Add a show to the database
		
		db.run("UPDATE show SET status = 1, directory = ? WHERE id = ?", data.directory, data.id, function(error, result){
			if (error) {
				logger.error(error);
				return;
			}
			if (data.status) {
				// Trigger scanner
			}
		});
	}).on('show.disable', function(data){
		db.run("UPDATE show SET status = 0 WHERE id = ?", data.id, function(data, result){
			if (error) {
				logger.error(error);
				return;
			}
		});
	}).on('show.season', function(data){
		// List all episodes of a show in a specific season
		db.get("SELECT * FROM show_episode AS E WHERE E.show_id = ? AND E.season = ?", data.id, data.season, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			
		});
	}).on('show.episodes', function(data){
		// List all episodes of a show, grouped by season
		db.all("SELECT * FROM show_episode WHERE show_id = ? ORDER BY season,episode ASC", data, function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			var results = [];
			var seasons = [];
			var episodes = [];
			
			rows.forEach(function(row){
				if (seasons.indexOf(row.season) == -1) seasons.push(row.season);
				if (!episodes[row.season]) episodes[row.season] = [];
				episodes[row.season].push(row);
			});
			seasons.forEach(function(season){
				var record = {
					season: season,
					episodes: episodes[season]
				}
				results.push(record);
			});
			socket.emit('show.episodes', {id: data, seasons: results});
		});
	}).on('show.episode', function(data){
		// Return a single episode of a show
		
		db.get("SELECT S.*, E.* FROM show_episode AS E INNER JOIN show AS S ON S.id = E.show_id WHERE E.id = ?", data.id, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('show.episode', row);
		});
	});
	
	socket.on('show.scan', function(data){
		var scanner = plugin('scanner');
		scanner.episodes(data.id);
	});
	
	// Search
	socket.on('search', function(data){
		db.all("SELECT * FROM show WHERE name LIKE '%?%' ORDER BY name ASC", data, function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			
		});
	});
	
});

/***********************************************************************/
// Default route
app.get('/', function(req, res) {	
	res.sendfile('views/index.html');
});



// Below is a chaotic mess of ideas and prototyping

app.get('/install', function(req, res){
	var shows = plugin('showdata');
	shows.list();
	
	res.end('Building database');
});


app.get('/check', function(req, res){
	var shows = plugin('showdata');
	
	logger.info('Searching torrents');
	shows.getLatest();
	
	res.end('Searching for new downloads');
});


app.get('/match', function(req, res){
	var shows = plugin('showdata');
	
	shows.match()
	
	res.end('Matching...');
});

app.get('/info/:show', function(req, res){
	var shows = plugin('showdata');
	shows.info(req.params.show);
	
});

app.get('/episodes/:show', function(req, res){
	var shows = plugin('showdata');
	shows.episodes(req.params.show);
	
});


app.get('/complete', function(req, res){
	
	torrent.complete();
	
	res.end('Checking for completed downloads');
});

app.get('/update', function(req, res){
	try {
		var exec = require('child_process').exec;
		exec('git --git-dir=' + process.cwd() + '/.git pull origin', function(error, stdout, stderr){
			if (error) {
				logger.error(error);
				return;
			}
			if (stdout.indexOf('Already up-to-date') == 0) {
				res.end('No update available.');
				return;
			}
			
			/*
			exec('cd ' + process.cwd() + ' && npm update', function(error, stdout, stderr){
				// Update npm packages
			});
			*/
			
			res.end('Update complete. Restarting server...');
			process.kill(process.pid, 'SIGUSR2');
		});
	} catch(e) {
		logger.error(e.message);
	}
});

/*
// Magnet parser test
var magnet = 'magnet:?xt=urn:btih:60800347c8346ebb16b192290194d64dbe560b0a&dn=Continuum+S02E12+720p+HDTV+x264-KILLERS+%5Beztv%5D&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337';
console.log(helper.formatMagnet(magnet));
*/

/*
app.get('/restart', function(req, res){
	res.end('Restarting server...');
	process.kill(process.pid, 'SIGUSR2');
});
*/
