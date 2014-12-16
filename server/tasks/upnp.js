module.exports = function(app,db,socket){
	try {
		var upnp = require('nat-upnp');
		var client = upnp.createClient();
		var mapPorts = function(){
			if (nconf.get('system:upnp')){
				client.portMapping({
					public: 6377,
					private: 80,
					ttl: 600
				}, function(error, response){
				//	if (error) logger.error(error, response);
				});
			}
		};
		if (nconf.get('system:upnp')) mapPorts();
		setInterval(mapPorts, 600000);
	} catch(e){
		logger.error(e.message);
	}
}
