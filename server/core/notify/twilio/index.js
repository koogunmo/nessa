var twilio = require('twilio')(nconf.get('twilio:sid'), nconf.get('twilio:token'));

exports = module.exports = {
	sms: function(message) {
		// Cend a text message to say that the download is complete
		twilio.sendSms({
			to: nconf.get('notify:sms'),
			from: nconf.get('twilio:phone'),
			body: message
			
		}, function(error, response){
			console.log(error, response);
		});
	}
};