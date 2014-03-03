try {
	var request = require('request'), schedule = require('node-schedule');
	function dynamicDNS(){
		request('http://myip.dnsomatic.com', function(error, response, ip){
			if (error) {
				console.error(error);
				return;
			}
			request('http://dns.silicomedia.com:8053/api/'+nconf.get('trakt:username')+'/'+ip, function(error, response, json){
				if (error) console.error(error);
				console.log(json);
			});
		});
	}
	var rule = new schedule.RecurrenceRule(); rule.minute = [0];
	schedule.scheduleJob(rule, function(){
		dynamicDNS();
	});
	dynamicDNS();
} catch(e){
	console.error(e.message);
}