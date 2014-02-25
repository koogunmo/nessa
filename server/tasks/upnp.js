/*
var upnp = require('nat-upnp');

var client = upnp.createClient();

var mapPorts = function(){
	client.portMapping({
		public: 6377,
		private: 80,
		ttl: 60
	}, function(error, response){
	//	console.log(error, response);
	});
};

setInterval(mapPorts, 60000);
mapPorts();
*/