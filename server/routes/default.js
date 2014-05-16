'use strict';

var log4js	= require('log4js');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:default');

module.exports = function(app, db){
	
	app.get('/', function(req, res) {	
		res.sendfile(process.cwd() + '/app/views/index.html');
		console.log('derp')
	});
	
	app.get('/api/installed', function(req, res){
		var response = {
			installed: nconf.get('installed')
		};
		res.send(response);
	});
	
};