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
							socket.emit('alert', {'title':'Movie downloaded','message':data.movie.title});
							if (data.trash) torrent.remove({'id':transfer.id,'purge':true});
						});
					}
					if (shows.complete) {
						shows.complete(transfer, function(error,data){
							if (error) return logger.error(error);
							socket.emit('alert', {'title':'Episode downloaded','message':show.name});
							if (data.trash) torrent.remove({'id':transfer.id,'purge':true});
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