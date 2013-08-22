/* Check for completed downloads, handle accordingly */

var schedule	= require('node-schedule');

var rule = new schedule.RecurrenceRule();
	rule.minute		= [0,10,20,30,40,50];

schedule.scheduleJob(rule, function(){
	
	torrent.complete();
	
	/*
	torrent.complete(function(items){
		items.forEach(function(item){
			db.get("SELECT * FROM show_episode WHERE hash = ? AND file IS NULL", item.hash, function(error, row){
				if (error || !row) return;
				
				var file = null;
				var size = 0;
				
				torrent.files.forEach(function(item){
					if (item.length <= size) return;
					size = item.length;
					file = torrent.dir + '/' + item.name;
				});
				showhelper.rename(file, row.id, function(name){
					try {
						helper.copyFile(file, name, function(){
							db.run("UPDATE show_episode SET file = ? WHERE id = ?", [path.basename(name), row.id]);
						});						
					} catch(e) {
						logger.error(e.message);
					}
				});
			});
		});
	});
	*/
});