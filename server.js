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
	},
	shows: {
		hd: 0
	},
	trakt: {
		enabled: 0
	},
	twilio: {
		enabled: 0
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
		var system = plugin('system');
		system.update();
		
	}).on('system.restart', function(data){
		// Restart the process, NOT the server
		var system = plugin('system');
		system.restart()
		
	});
	
	
	/* Page handlers */
	
	socket.on('main.dashboard', function(){
		socket.emit('page.template', {
			template: 'views/main/dashboard.html',
			data: {}
		});
	}).on('main.settings', function(){
		socket.emit('page.template', {
			template: 'views/main/settings.html',
			data: nconf.get()
		});
	}).on('shows.enabled', function(){
		// List of enabled/subscribed shows
		db.all("SELECT * FROM show WHERE directory IS NOT NULL ORDER BY name ASC", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('page.template', {
				template: 'views/show/list.html',
				data: {
					shows: rows
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
		db.get("SELECT * FROM show WHERE id = ?", id, function(error, row){
			if (error) {
				logger.error(error);
				return;
			}
			if (!row) return;
			var update = {
				status: 1,
				directory: null
			};
			if (!row.directory) {
				try {
					var mkdir = require('mkdirp');
					mkdir(nconf.get('shows:base') + '/' + row.name, 0644);
					update.directory = row.name;
				} catch(e) {
					logger.error(e.message);
				}
			} else {
				update.directory = row.directory;
			}
			
			db.run("UPDATE show SET status = ?, directory = ? WHERE id = ?", update.status, update.directory, row.id, function(error){
				if (error) {
					logger.error(error);
					return;
				}
				socket.emit('page.reload');
				var show = plugin('showdata');
				show.info(row.id);
			});
		});
		
	}).on('show.disable', function(data){
		// Needs improving
		db.run("UPDATE show SET status = 0 WHERE id = ?", data.id, function(error){
			if (error) {
				logger.error(error);
				return;
			}
		});
	});
	
	/* List shows */
	socket.on('shows.unmatched', function(){
		db.all("SELECT id, directory FROM show_unmatched ORDER BY directory", function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			var response = {
				shows: []
			};
			if (rows) {
				var parser	= new(require('xml2js')).Parser();
				var count	= 0;
				rows.forEach(function(row){
					request.get('http://thetvdb.com/api/GetSeries.php?seriesname='+row.directory, function(error, req, xml){
						parser.parseString(xml, function(error, json){
							if (error) {
								logger.error(error);
								return;
							}
							try {
								if (!json.Data.Series) return;
								if (json.Data.Series.length >= 1) {
									var results = [];
									json.Data.Series.forEach(function(data){
										if (!data) return;
										var record = {
											id: data.id[0],
											name: data.SeriesName[0],
											year: (data.FirstAired) ? data.FirstAired[0].substring(0,4) : null,
											synopsis: (data.Overview) ? data.Overview[0] : null,
											imdb: (data.IMDB_ID) ? data.IMDB_ID[0] : null
										};
										if (!record.year || !record.year) return;
										results.push(record);
									});
									row.matches = results;
									response.shows.push(row);
								}
							} catch(e) {
								logger.error(e);
							}
						});
						count++;
						if (rows.length == count) {
							socket.emit('shows.unmatched', response);
						}
					});
				});
			}
		//	socket.emit('shows.unmatched', response);
		});
	}).on('shows.match', function(data){
		var qs = require('querystring');
		
		console.log(qs.parse(data));
	});
	
	
	
	/* Individual show data */
	socket.on('show.info', function(data){
		// Fetch individual show details
		db.get("SELECT * FROM show WHERE id = ?", data, function(error, show){
			if (error) {
				logger.error(error);
				return;
			}
			if (!show) return;
			show.seasons = [];
			
			db.all("SELECT * FROM show_episode WHERE show_id = ? ORDER BY season,episode ASC", show.id, function(error, rows){
				if (error) {
					logger.error(error);
					return;
				}
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
					show.seasons.push(record);
				});
				socket.emit('modal.template', {
					template: 'views/show/info.html',
					data: show
				});
			});
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
	socket.on('show.search', function(data){
		var query = '%'+data+'%';
		db.all("SELECT * FROM show WHERE name LIKE ? AND status = 0 ORDER BY name ASC", query, function(error, rows){
			if (error) {
				logger.error(error);
				return;
			}
			socket.emit('show.search', {shows: rows});
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
	shows.list(true);
	res.end('Building database');
});


app.get('/artwork', function(req, res){
	var shows = plugin('showdata');
	shows.artwork();
	res.end('fetching show artwork');
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


app.get('/system/update', function(req, res){
	var system = plugin('system');
	system.update();
	
	res.end('Updating...');
});


/*
// Magnet parser test
var magnet = 'magnet:?xt=urn:btih:60800347c8346ebb16b192290194d64dbe560b0a&dn=Continuum+S02E12+720p+HDTV+x264-KILLERS+%5Beztv%5D&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337';
console.log(helper.formatMagnet(magnet));
*/

/*
app.get('/system/reboot', function(req, res){
	res.end('Restarting server...');
	process.kill(process.pid, 'SIGUSR2');
});
*/
