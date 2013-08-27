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

global.helper = require('./core/helper');
global.torrent = plugin('transmission');

/* Express */
var app		= express();
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.bodyParser());

/* Socket.IO */
server		= app.listen(nconf.get('port'));
io			= require('socket.io').listen(server);

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
/* Socket Events */

io.configure(function(){
	// Set log level to 'info' ('debug' is too noisy).
	io.set('log level', 2);
	// Compress ALL THE THINGS!
	io.enable('browser client minification');
	io.enable('browser client gzip')    
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
	
});

/***********************************************************************/
// Default route
app.get('/', function(req, res) {	
	res.sendfile('index.html');
});



// Below is a chaotic mess of ideas and prototyping

app.get('/install', function(req, res){
	
	// Scan FS for show folders
	var shows = plugin('showdata'),
		scanner = plugin('scanner');
	
	events.on('shows.list', function(error, id){
		scanner.shows();
	}).on('scanner.shows', function(error, id){
		shows.info(id);
	}).on('shows.info', function(error, id){
		shows.episodes(id);
	}).on('shows.episodes', function(error, id){
		scanner.episodes(id);
	});
	
	res.end('Building database');
	shows.list();
});


app.get('/check', function(req, res){
	var shows = plugin('showdata');
	
	logger.info('Searching torrents');
	shows.getLatest();
	
	res.end('Searching for new downloads');
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
