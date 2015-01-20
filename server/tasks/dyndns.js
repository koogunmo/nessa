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
			request.get('http://myip.dnsomatic.com', function(error, response, ip){
				if (error) logger.error(error);
				if (ip){
					var payload = {'address':ip,'username':nconf.get('dyndns:username')};
					request.post('http://dns.silico.media:8053/api/update', {'body':payload,'json':true}, function(error,res,json){
						if (error) logger.error(error);
						if (json){
							if (json.error) logger.error('DynDNS update error', json.error);
							if (json.status){
								logger.debug('DynDNS update successful');
							}
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