/* Check for completed downloads every 5 minutes */

setInterval(function(){
	torrent.complete();
}, 300000);
torrent.complete();