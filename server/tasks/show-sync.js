'use strict';

var log4js = require('log4js');
log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('task-showsync');

/* Update show listings from XML */
module.exports = function(app,db,socket){
	
	var ObjectID = require('mongodb').ObjectID;
	var showCollection = db.collection('show'),
		userCollection = db.collection('user');
	
	var resync = function(){
		showCollection.find({'resync':{$exists:true}},{'name':true,'imdb':true,'users':true}).toArray(function(error,shows){
			if (error) logger.error(error);
			if (shows){
				shows.forEach(function(show){
					if (!show.users) return
					show.users.forEach(function(u){
						userCollection.findOne({'_id':ObjectID(u._id)},{'username':true,'trakt':true}, function(error,user){
							if (error) logger.error(error);
							if (user){
								require('nodetv-shows').getProgress(user,show.imdb).then(function(){
									logger.debug('Progress update: %s (%s)', show.name, user.username);
								}).catch(function(e){
									if (error) logger.error('%s (%s): %s', show.name, user.username, e.error);
								});
							}
						});
					});
				});
			}
		});
	}
	setInterval(resync, 300000);
	resync();
};