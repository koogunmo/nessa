'use strict';

module.exports = function(app, db, socket){
	
	app.get('/api/system', function(req,res){
		res.send(nconf.get());
		
	}).post('/api/system', function(req,res){
		for (var i in json) {
			nconf.set(i, json[i]);
		}
		nconf.save(function(error){
			if (error) {
				/*
				socket.emit('system.alert', {
					type: 'danger',
					message: 'Settings were not saved'
				});
				*/
				res.send(400);
				return;
			}
			res.send(200);
			/*
			socket.emit('system.alert', {
				type: 'success',
				message: 'Settings saved',
				autoClose: 2500
			});
			// Update media path
			if (!nconf.get('listen:nginx')){
				app.use('/media', express.static(nconf.get('media:base')));
			}
			*/
		});
	});
	
	
	app.get('/api/users', function(req,res){
		// List users
		
	}).post('/api/users', function(req,res){
		// Create user
		
	});
	
	app.get('/api/user/:id', function(req,res){
		// Fetch user
		
	}).post('/api/user/:id', function(req,res){
		// Update user
		
	}).delete('/api/user/:id', function(req,res){
		// Remove user
		
	});
	
};