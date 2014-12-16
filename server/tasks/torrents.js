'use strict';

/* Check for completed downloads every 5 minutes */
module.exports = function(app,db,socket){
	var movies	= plugin('moviedata'),
		shows	= plugin('showdata');
	try {
		var checkDownloads = function(){
			torrent.getComplete(function(error, torrents){
				torrents.forEach(function(transfer){
					if (movies.complete) {
						movies.complete(transfer, function(error, data){
							if (error) return logger.error(error);
					//		socket.emit('alert', {title: 'Download Complete', message: data.title});
					//		if (data.trash) torrent.remove({id: transfer.id, purge: true});
						});
					}
					/*
					if (shows.complete) {
						shows.complete(torrent, function(error,data){
							if (error) return logger.error(error);
							socket.emit('alert', {title: 'Download Complete', message: transfer.title});
							if (data.trash) torrent.remove({id: transfer.id, purge: true});
						});
					}
					*/
				});
			});
		};
		/*
		var downloadComplete = function(error,transfer){
			if (error) return logger.error(error);
			socket.emit('alert', {title: 'Download Complete', message: transfer.title});
			if (data.trash) torrent.remove({id: transfer.id, purge: true});
		};
		*/
		
		setInterval(function(){
			checkDownloads();
			// Legacy method (for shows)
			torrent.complete();
		}, 300000);
		
		checkDownloads();
		
		// Legacy method (for shows)
		torrent.complete();
		
	} catch(e){
		logger.error(e.message);
	}
};