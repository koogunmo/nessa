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
			torrent.getComplete(function(error, transfers){
				transfers.forEach(function(transfer){
					if (movies.complete){
						movies.complete(transfer).then(function(data){
							if (data.trash){
								logger.debug('Trashing:', data.movie.title);
								torrent.remove(transfer.id,true,trashResponse);
							}
							socket.emit('alert',{
								'type':'success',
								'title':'Movie downloaded',
								'message':data.movie.title,
								'icon':'/media/'+nconf.get('media:movies:directory')+'/.artwork/'+data.movie.imdb+'/poster.jpg'
							});
						}, function(error){
							if (error) logger.error(error);
						});
					}
					if (shows.complete){
						shows.complete(transfer).then(function(data){
							if (data.trash){
								logger.debug('Trashing:', data.show.name);
								torrent.remove(transfer.id,true,trashResponse);
							}
							socket.emit('alert',{
								'type':'success',
								'title':'Episode downloaded',
								'message':data.show.name,
								'icon':'/media/'+nconf.get('media:shows:directory')+'/'+data.show.directory+'/poster.jpg'
							});
						}, function(error){
							if (error) logger.error(error);
						});
					}
				});
			});
		};
		var trashResponse = function(error, args){
			if (error) logger.error(error);
		};
		
		setInterval(function(){
			checkDownloads();
		}, 300000);
		checkDownloads();
	} catch(e){
		logger.error(e.message);
	}
};