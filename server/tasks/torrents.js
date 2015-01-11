'use strict';

var log4js = require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('task-torrents');


/* Check for completed downloads every 5 minutes */
module.exports = function(app,db,socket){
	var movies	= require('nodetv-movies'),
		shows	= require('nodetv-shows'),
		torrent = require('nodetv-transmission')(nconf.get('transmission'));
	
	try {
		var checkDownloads = function(){
			logger.debug('Checking downloads...');
			torrent.getComplete(function(error, transfers){
				transfers.forEach(function(transfer){
				//	logger.debug(transfer.title);
					
					if (movies.complete){
						movies.complete(transfer).then(function(data){
						//	if (data.trash) torrent.remove(transfer.id,true);
							socket.emit('alert', {'title':'Movie downloaded','message':data.movie.title});
						});
					}
					if (shows.complete){
						shows.complete(transfer).then(function(data){
						//	if (data.trash) torrent.remove(transfer.id,true);
							socket.emit('alert', {'title':'Episode downloaded','message':data.show.name});
						});
					}
				});
			});
		};
		setInterval(function(){
			checkDownloads();
		}, 300000);
		checkDownloads();
	} catch(e){
		logger.error(e.message);
	}
};