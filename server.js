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

try {
	/* Global Configuration */
	global.pkg = require('./package.json');
	global.plugin = function(name){
		try {
			return require(__dirname + '/server/libs/' + name);
		} catch(e) {
			logger.error(e.message);
		}
		return false;
	};
	global.helper	= require('./server/core/helper');
	
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

var	express	= require('express'),
	fs		= require('fs'),
	path	= require('path');

/* Global methods */
global.events = new (require('events')).EventEmitter;

logger.info(process.title + ' v'+pkg.version);

/***********************************************************************/
/* Create server */

var app		= require('express')(),
	server	= require('http').Server(app),
	io		= require('socket.io')(server),
	port	= (nconf.get('listen:nginx')) ? 6377 : nconf.get('listen:port');

server.listen(port);

server.on('listening', function(){
	logger.info('Listening on port '+ server.address().port);
});
	
/* Change ownership of the process */
if (process.getuid) {
	try {
		process.env['HOME'] = process.cwd();
		if (nconf.get('run:group')) process.setgid(nconf.get('run:group'));
		if (nconf.get('run:user')) process.setuid(nconf.get('run:user'));
	} catch(e) {
		logger.warn(e.message);
	}
}

/***********************************************************************/
/* Set up Express */
app.enable('trust proxy');
app.use(require('compression')());
app.use(require('cookie-parser')());
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({extended: true}));

app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');


/***********************************************************************/

// Move this
if (!nconf.get('listen:nginx')){
	app.use('/app', express.static(process.cwd() + '/app'));
	app.use('/assets', express.static(process.cwd() + '/app/assets'));
	app.use('/template', express.static(process.cwd() + '/app/views/ui'));
	app.use('/views', express.static(process.cwd() + '/app/views'));
}

try {
	if (nconf.get('installed') && nconf.get('mongo')) {
		var dsn = 'mongodb://';
		if (nconf.get('mongo:auth')) {
			dsn += nconf.get('mongo:username')+':'+nconf.get('mongo:password')+'@';
		}
		dsn += nconf.get('mongo:host')+':'+nconf.get('mongo:port')+'/'+nconf.get('mongo:name');
		
		var mongo = require('mongodb').MongoClient;
		mongo.connect(dsn, {w:1}, function(error, db){
			if (error) {
				console.error('Unable to connect to MongoDB');
				process.kill();
				return;
			}
			logger.info('MongoDB: Connected to '+nconf.get('mongo:host'));
			global.db = db;
			
			global.torrent	= plugin('transmission');
			
			/*
			if (nconf.get('installed') && nconf.get('trakt:username') != 'greebowarrior'){
				trakt(user.trakt).network.follow('greebowarrior', function(error,json){
					logger.info(error, json);
				});
			}
			*/
			if (nconf.get('media:base') && !nconf.get('listen:nginx')){
				app.use('/media', express.static(nconf.get('media:base')));
			}
			
			var socket = false;
			
			// Load routes
			require('./server/routes/auth')(app,db);
			require('./server/routes/dashboard')(app,db);
			require('./server/routes/default')(app,db,socket);
			require('./server/routes/downloads')(app,db,socket);
			require('./server/routes/movies')(app,db,socket);
			require('./server/routes/shows')(app,db,socket);
			require('./server/routes/system')(app,db,socket);
			require('./server/routes/users')(app,db,socket);
			
			// Default to sending the index.html
			app.use(function(req, res) {	
				res.sendFile(process.cwd() + '/app/views/index.html');
			});
			
			// Load tasks
			if (nconf.get('installed')) {
				fs.readdir(process.cwd() + '/server/tasks', function(error, files){
					if (error) {
						logger.error(error);
						return;
					}
					if (files === undefined) return;
					files.filter(function(file){
						return (file.substr(-3) == '.js');
					}).forEach(function(file){
						require(process.cwd() + '/server/tasks/' + file);
					});
				});
			}
		});
	} else {
		nconf.set('installed', false);
		logger.warn('Waiting for install.');
	//	app.use(function(req, res) {
	//		res.sendFile(process.cwd() + '/app/views/index.html');
	//	});
	}
} catch(e){
	logger.error(e.message);
}
