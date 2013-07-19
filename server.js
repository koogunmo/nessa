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
	uuid	= require('node-uuid'),
	xml2js	= new (require('xml2js')).Parser();

global.logger = logger;

/* Express */
var app		= express();
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.bodyParser());

/* Socket.IO */
server		= app.listen(nconf.get('port'));
socket		= require('socket.io').listen(server);

logger.info('nessa.js: Listening on port ' + nconf.get('port'));

/* Database */
global.db = new sqlite.Database(__dirname + '/db/nessa.sqlite', function(error){
	if (error) {
		// Unable to open database - Create and try again?
		logger.error(error);
	}
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
// Below is a chaotic mess of ideas and prototyping






// Default route
app.get('/', function(req, res) {	
	res.end("We'll make the interface later");
});

app.get('/install', function(req, res){
	
	// Scan FS for show folders
	
	/* Setup order
	--
	1. shows.list()
	2. scanner.shows()
	3. shows.info()
	4. shows.episodes()
	5. scanner.episodes()
	*/
	
	// TO DO
	// Manual matching of TV shows in FS to TVDB data
	
//	var scanner = plugin('scanner');
//	scanner.shows();
	
	var shows = plugin('showdata');
	
//	shows.episodes();
	
	// Retrieve TVDB data
//	tvshows.info();
	
	// Retrieve TVRage ID - needs to run after TVDB is done
//	tvshows.tvrage();
	
	// Retrieve episode listings for enabled shows
//	tvshows.episodes();
	
	// Scan FS for episodes & match
	
	res.end('Installation complete.');
});


/*
app.get('/restart', function(req, res){
	res.end('Restarting server...');
	process.kill(process.pid, 'SIGUSR2');
});
*/
