// Load notifications
var notify = nconf.get('notify');

module.exports = exports = {
	
	send: function(message) {
		// Send a notification using all enabled transports
		
		//file + ' has been downloaded and is ready to watch.'
		
		if (notify.sms) {
			// twilio (limit to 140 characters)
		}
		if (notify.email) {
			// email
		}
	}
}