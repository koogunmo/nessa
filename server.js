'use strict';

/* Enable New Relic Monitoring, if available */
try{require('newrelic')} catch(e){}
/******************************************************************************/
/* Set up logging to run according to the environment */
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

var log4js = require('log4js')
log4js.configure({'appenders':[{'type': 'console'}],'replaceConsole':true});
var logger = log4js.getLogger('nodetv-server');
//logger.setLevel((process.env.NODE_ENV=='production')?'WARN':'ALL');
/******************************************************************************/
try {
	/* Global Configuration */
	global.pkg		= require('./package.json');
	global.helper	= require('./server/core/helper');
	
	/* Load Settings */
	global.nconf = require('nconf');
	global.nconf.file({
		'file': __dirname + '/settings.json'
	}).defaults({
		'installed': false,
		'listen': {'address':'0.0.0.0','port':6377},
		'run': {'user':'media','group':'media'},
		'system': {
			'updates':{'enabled':true,'branch':'master'},
			'dyndns': false,
			'upnp': false
		}
	});
	/* Set a friendly process name */
	if (process.title) process.title = 'NodeTV';
	if (process.cwd() != __dirname) process.chdir(__dirname);
} catch(e){
	logger.warn(e.message);
}
/******************************************************************************/
logger.info(process.title + ' v'+pkg.version);
/******************************************************************************/
/* Create server */

var app		= require('express')(),
	server	= require('http').Server(app),
	io		= require('socket.io')(server),
	port	= (nconf.get('listen:nginx')) ? 6377 : nconf.get('listen:port');

server.listen(port);

server.on('listening',function(){
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

/******************************************************************************/
/* Set up Express */
app.use(require('compression')());
app.use(require('cookie-parser')());
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({'extended':true}));

app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
/******************************************************************************/

// Move this to somewhere sensible...
if (!nconf.get('listen:nginx')){
	app.use('/app', require('express').static(process.cwd() + '/app'));
	app.use('/assets', require('express').static(process.cwd() + '/app/assets'));
	app.use('/template', require('express').static(process.cwd() + '/app/views/ui'));
	app.use('/views', require('express').static(process.cwd() + '/app/views'));
}

try {
	var	fs = require('fs'), path = require('path'), Q = require('q');
	var dbConnect = function(msg){
		try {
			logger.info('MongoDB: Connecting to '+nconf.get('mongo:host')+'...');
			var deferred = Q.defer();
			var dsn = 'mongodb://';
			if (nconf.get('mongo:auth')) {
				dsn += nconf.get('mongo:username')+':'+nconf.get('mongo:password')+'@';
			}
			dsn += nconf.get('mongo:host')+':'+nconf.get('mongo:port')+'/'+nconf.get('mongo:name');
			var mongo = require('mongodb').MongoClient;
			mongo.connect(dsn,{'w':1},function(error,db){
				if (error) deferred.reject(error)
				if (db) deferred.resolve(db);
			});
			return deferred.promise;
		} catch(e){
			logger.error(e.message)
		}
	};
	var dbConnected = function(db){
		try {
			logger.info('MongoDB: Connected');
			global.db = db;
			
			if (nconf.get('media:base') && !nconf.get('listen:nginx')){
				app.use('/media', require('express').static(nconf.get('media:base')));
			}
			
			require('./server/routes/auth')(app,db,io);
			require('./server/routes/dashboard')(app,db,io);
			require('./server/routes/default')(app,db,io);
			require('./server/routes/downloads')(app,db,io);
			require('./server/routes/movies')(app,db,io);
			require('./server/routes/shows')(app,db,io);
			require('./server/routes/system')(app,db,io);
			require('./server/routes/users')(app,db,io);
	
			app.use(function(req, res) {	
				res.sendFile(process.cwd() + '/app/views/index.html');
			});
			
			setTimeout(function(){
				fs.readdir(process.cwd() + '/server/tasks', function(error, files){
					if (error) {
						logger.error(error);
						return;
					}
					if (files === undefined) return;
					files.filter(function(file){
						return (file.substr(-3) == '.js');
					}).forEach(function(file){
						require(process.cwd() + '/server/tasks/' + file)(app,db,io);
					});
				});
			},1000);
		} catch(e){
			logger.error(e.message)
		}
	};
	var dbError = function(error){
		logger.error('MongoDB: Unable to connect. Retrying...');
		setTimeout(function(){
			dbConnect().then(dbConnected,dbError);
		}, 2500);
	};
	
	dbConnect().then(dbConnected,dbError);
} catch(e){
	logger.error(e.message);
}
