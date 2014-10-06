/* Check for completed downloads every 5 minutes */

try {
	setInterval(function(){
		torrent.complete();
	}, 300000);
	torrent.complete();
} catch(e){
	console.error(e.message);
}