'use strict';

/* Check for completed downloads every 5 minutes */
module.exports = function(app,db,socket){
	var movies	= require('nodetv-movies'),
		shows	= require('nodetv-shows'),
		torrent = require('nodetv-transmission')(nconf.get('transmission'));
	
	try {
		var checkDownloads = function(){
			torrent.getComplete(function(error, transfers){
				transfers.forEach(function(transfer){
					if (movies.complete) {
						movies.complete(transfer, function(error, data){
							if (error) return logger.error(error);
							if (data.trash) torrent.remove(transfer.id,true);
							socket.emit('alert', {'title':'Movie downloaded','message':data.movie.title});
						});
					}
					if (shows.complete) {
						shows.complete(transfer, function(error,data){
							if (error) return logger.error(error);
							if (data.trash) torrent.remove(transfer.id,true);
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