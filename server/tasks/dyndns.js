'use strict';

module.exports = function(app,db,socket){
	try {
		/*
		var request = require('request'), schedule = require('node-schedule');
		var dynamicDNS = function(){
			if (!nconf.get('system:dyndns')) return;
			
			return;
			
			request('http://myip.dnsomatic.com', function(error, response, ip){
				if (error) logger.error(error);
				if (ip){
					request('http://dns.silicomedia.com:8053/api/'+nconf.get('trakt:username')+'/'+ip, function(error, response, json){
						if (error) console.error('Dynamic DNS Error:', error.message);
					});
				}
			});
		}
		var rule = new schedule.RecurrenceRule(); rule.minute = [0];
		schedule.scheduleJob(rule, dynamicDNS);
		dynamicDNS();
		*/
	} catch(e){
		logger.error(e.message);
	}
}