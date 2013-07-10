/***********************************************************************/
/* Initialization */

/* Set a friendly process name */
if (process.title) process.title = 'nessa.js';

/* Load Settings */
nconf = require('nconf').defaults({
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

/***********************************************************************/
/* Load dependencies */

extend	= require('xtend'),
express	= require('express'),
fs		= require('fs'),
logger	= require('log4js').getLogger(),
mime	= require('mime'),
path	= require('path'),
request	= require('request'),
sqlite	= require('sqlite3').verbose(),
sys		= require('sys'),
tvdb	= new (require('tvdb'))({apiKey: nconf.get('tvdb:apikey')}),
tvrage	= require('./libs/tvrage'),
url		= require('url'),
uuid	= require('node-uuid'),
xml2js	= new (require('xml2js')).Parser();

torrent	= require('./libs/transmission');


var showhelper	= require('./core/show');

/* Express */
var app		= express();
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.bodyParser());

/* Socket.IO */
server		= app.listen(nconf.get('port'));
socket		= require('socket.io').listen(server);

logger.info('nessa.js: Listening on port ' + nconf.get('port'));


/* Database */
db = new sqlite.Database(__dirname + '/db/nessa.sqlite', function(error){
	if (error) {
		// Unable to open database
		console.error(error);
		// Create database and try again
	}
});




var tvshows = require('./libs/tvshows');
/*
tvshows.update(function(show){
	
});
*/

/// INSTALL
tvshows.list(function(){
	tvshows.update();
});


/***********************************************************************/
/* Handle events */
/*
process.on('SIGTERM', function(){
	logger.info('Shutting down...');
});
/*
process.on('SIGUSR2', function(){
	process.kill(process.pid, 'SIGUSR2');
});
*/
/***********************************************************************/

/* Load helper functions */
helper = require('./core/helper');

/* Load all schedule tasks */
fs.readdir(__dirname + '/core/tasks', function(error, files){
	files.filter(function(file){
		return (file.substr(-3) == '.js');
	}).forEach(function(file){
		require(__dirname + '/core/tasks/' + file);
	});
});

/***********************************************************************/

// Below is a chaotic mess of ideas and prototyping

// Default route
app.get('/', function(req, res) {	
	res.end("We'll make the interface later");
});

/*
app.get('/restart', function(req, res){
	res.end('Restarting server...');
	logger.info('Restarting...');
	process.kill(process.pid, 'SIGUSR2');
});
*/

/*
app.get('/api/show/search/:name', function(req, res){
	// Example of searching TVRage for a TV show
	
	//var tvdb = new TVDB({apiKey: nconf.get('tvdb:apikey'), language: 'en'});
	//tvdb.findTvShow(req.params['name'], function(error, results) {
	tvrage.search(req.params['name'], function(results) {	
		// format and return
		
		res.end(JSON.stringify(results));
		
	})
});
*/
/*
app.get('/tvshows', function(req, res) {
	try {
		var tvs = require('./core/source/tvshows');
		
		tvs.check();
		
	} catch(e) {
		logger.error(e.message);
	}
	res.end('console.log');
});
*/
/*
app.get('/install', function(req, res){
	// Create and populate a database from scratch
	
	try {
		
		// Fetch thew TVShows list to fill shows list
	//	var tvs = require('./core/source/tvshows');
	//	tvs.list();
		
		// Scan for local series, and match to shows base on name
		require('./core/scanner/show');
			// add any that aren't already in there
			// flag available as status=1
		
		
	} catch(e) {
		logger.error(e.message);
	}
	res.end('Populating database.');
});
*/