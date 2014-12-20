module.exports = function(app,db,socket){
	var uuid	= require('node-uuid');
	
	try {
		var sessionid	= uuid.v4();
		logger.info('New connection (' + socket.transport + ') ' + sessionid);
		
	} catch(e) {
		logger.error('Socket Connection: ' + e.message);
	}
	
	var eventAlerts = function(data){
		socket.emit('system.alert', {
			type: data.type,
			message: data.message
		});
	};
	
//	events.on('system.alert', eventAlerts);
	socket.on('reconnected', function(data) {
		try {
			logger.info(data);
		} catch(e) {
			logger.error('Socket reconnect: ' + e.message);
		}
		
	}).on('disconnect', function(data){
		// User disconnected
		try {
			if (eventAlerts) events.removeListener('system.alert', eventAlerts);
		} catch(e) {
			logger.error('Socket disconnect: ' + e.message);
		}
	});
	
};
