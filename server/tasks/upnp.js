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
			//	console.log(error, response);
			});
		}
	};
	if (nconf.get('system:upnp')) mapPorts();
	setInterval(mapPorts, 600000);
} catch(e){
	console.error(e.message);
}