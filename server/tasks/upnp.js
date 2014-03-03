try {
	var upnp = require('nat-upnp');
	var client = upnp.createClient();
	var mapPorts = function(){
		client.portMapping({
			public: 6377,
			private: 80,
			ttl: 600
		}, function(error, response){
		//	console.log(error, response);
		});
	};
	if (nconf.get('system:upnp')) {
		setInterval(mapPorts, 600000);
		mapPorts();
	}
} catch(e){
	console.error(e.message);
}