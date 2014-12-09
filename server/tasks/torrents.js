/* Check for completed downloads every 5 minutes */
var movies	= plugin('moviedata'),
	shows	= plugin('showdata');

try {
	var checkDownloads = function(){
		torrent.getComplete(function(error, torrents){
			torrents.forEach(function(transfer){
				if (movies.complete) {
					movies.complete(transfer, function(error, data){
						if (data.trash) torrent.remove({id: transfer.id, purge: true});
					});
				}
				if (shows.complete) {
					shows.complete(torrent);
				}
			});
		});
	}
	
	setInterval(function(){
		checkDownloads();
		torrent.complete();
	}, 300000);
	
	checkDownloads();
	
	torrent.complete();
} catch(e){
	console.error(e.message);
}