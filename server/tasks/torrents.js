/* Check for completed downloads every 5 minutes */
var movies	= plugin('moviedata'),
	shows	= plugin('showdata');

try {
	setInterval(function(){
		torrent.complete();
	}, 300000);
	torrent.complete();
	
	// New completing function
	torrent.getComplete(function(error, torrents){
		torrents.forEach(function(torrent){
			if (movies.complete) movies.complete(torrent);
			if (shows.complete) shows.complete(torrent);
		});
	});
	
} catch(e){
	console.error(e.message);
}