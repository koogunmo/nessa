'use strict';

module.exports = function(app,db,socket){
	try {
		var request = require('request'), schedule = require('node-schedule');
		var dynamicDNS = function(){
			request('http://myip.dnsomatic.com', function(error, response, ip){
				if (error) {
					console.error(error);
					return;
				}
				request('http://dns.silicomedia.com:8053/api/'+nconf.get('trakt:username')+'/'+ip, function(error, response, json){
					if (error) console.error('Dynamic DNS Error:', error.message);
				});
				
			});
		}
		var rule = new schedule.RecurrenceRule(); rule.minute = [0];
		schedule.scheduleJob(rule, function(){
			if (nconf.get('system:dyndns')) dynamicDNS();
		});
		if (nconf.get('system:dyndns')) dynamicDNS();
	} catch(e){
		console.error(e.message);
	}
}