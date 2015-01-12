'use strict';

var log4js = require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('task-dyndns');

module.exports = function(app,db,socket){
	try {
		var request = require('request'), schedule = require('node-schedule');
		var dynamicDNS = function(){
			if (!nconf.get('dyndns:enabled')) return;
			logger.debug('Updating DynDNS...');
			request('http://myip.dnsomatic.com', function(error, response, ip){
				if (error) logger.error(error);
				if (ip){
					request('http://dns.silico.media:8053/api/'+nconf.get('dyndns:username')+'/'+ip, function(error, response, json){
						if (error) logger.error(error.message);
						if (json){
							if (json.url) logger.debug('Public URL:', json.url);
							logger.debug(json);
						}
					});
				}
			});
		}
		var rule = new schedule.RecurrenceRule(); rule.minute = [0];
		schedule.scheduleJob(rule, dynamicDNS);
		dynamicDNS();
	} catch(e){
		logger.error(e.message);
	}
}