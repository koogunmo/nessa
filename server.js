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

var	crypto	= require('crypto'),
	express	= require('express'),
	fs		= require('fs'),
	path	= require('path');

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
	listen	= {
		host: (nconf.get('listen:nginx')) ? '127.0.0.1' : nconf.get('listen:address'),
		port: (nconf.get('listen:nginx')) ? 6377 : nconf.get('listen:port')
	},
	server	= app.listen(listen.port, listen.host),
	io		= require('socket.io').listen(server, {
		'browser client': false,
		'log level': 1
	});
	
server.on('listening', function(){
//	logger.info('Listening on http://' + server.address().address +':'+ server.address().port);
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

/* Set up Express */
var bodyParser	= require('body-parser'),
	cookieParser = require('cookie-parser'),
	compress	= require('compression');
	
app.use(compress());
app.use(cookieParser());
app.use(bodyParser());

if (!nconf.get('listen:nginx')){
	app.use('/assets', express.static(process.cwd() + '/app/assets'));
	app.use('/template', express.static(process.cwd() + '/app/views/ui'));
	app.use('/views', express.static(process.cwd() + '/app/views'));
}
app.enable('view cache');

try {
	require('./server/routes/system')(app);
	
	if (nconf.get('installed') && nconf.get('mongo')) {
		var MongoDb		= require('mongodb').Db,
			MongoClient	= require('mongodb').MongoClient,
			MongoServer	= require('mongodb').Server;
		
		var mongo = new MongoDb(nconf.get('mongo:name'), new MongoServer(nconf.get('mongo:host'), nconf.get('mongo:port')), {w: 1});
		mongo.open(function(error, db){
			if (error) {
				console.error('Unable to connect to MongoDB');
				process.kill();
				return;
			}
			
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
			
			if (nconf.get('media:base') && !nconf.get('listen:nginx')){
				app.use('/media', express.static(nconf.get('media:base')));
			}
			
			var socket = false;
			io.sockets.on('connection', function(s){
				/* Load socket listeners */
				socket = s;
				require('./server/routes/sockets')(app,db,socket);
			});
			
			/* Load routes */
			require('./server/routes/default')(app,db,socket);
			require('./server/routes/downloads')(app,db,socket);
			require('./server/routes/login')(app,db,socket);
		//	require('./server/routes/movies')(app,db,socket);
			require('./server/routes/shows')(app,db,socket);
			require('./server/routes/users')(app,db,socket);
			
			app.use(function(req, res) {	
				res.sendfile(process.cwd() + '/app/views/index.html');
			});
			
			/* Load tasks */
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
//		app.use(app.router);
		app.use(function(req, res) {
			res.sendfile(process.cwd() + '/app/views/index.html');
		});
	}
} catch(e){
	logger.error(e.message);
}
