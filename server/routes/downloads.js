'use strict';

var log4js	= require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('routes:downloads');

module.exports = function(app, db, socket){
	var torrents	= require('nodetv-transmission')(nconf.get('transmission'));
	
	app.get('/api/downloads', function(req,res){
		torrents.get(function(error, data){
			if (error) return console.error(error);
			res.send(data.torrents);
		});
	})
	
	app.post('/api/downloads', function(req,res){
		if (req.body.url){
			torrents.add(req.body.url, function(error, data){
				if (error) return logger.error(error);
			});
			res.status(202).end();
		}
	})
	
	app.get('/api/downloads/:id', function(req,res){
		// Get torrent data
		torrents.info(parseInt(req.params.id, 10), function(error, data){
			if (error){
				logger.error(error);
				return res.status(404).send({'success':false})
			}
			if (data.torrents[0]) res.send(data.torrents[0]);
		});
	}).post('/api/downloads/:id', function(req,res){
		if (typeof(req.body.status) != 'undefined'){
			
			// Per-torrent settings?
			
			torrents.setStatus(req.params.id, req.body.status, function(error,json){
				res.status(202).send({'success': true});
			});
		}
	}).delete('/api/downloads/:id', function(req,res){
		// Remove & delete torrent
		torrents.remove(parseInt(req.params.id,10), true, function(error){
			if (error){
				logger.error(error);
				return res.status(404).send({'success':false});
			}
			res.status(204).send({'success':true});
		});
	})
};