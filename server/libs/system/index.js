var git = require('gitty');
var npm = require('npm');

var system = {
	update: function(callback){
		try {
			var restart = false;
			
			var repo = git(process.cwd());
			repo.pull('origin', nconf.get('system:branch'), function(error, success){
				if (error) {
					logger.error(error);
					return;
				}
				events.emit('system.alert', {
					type: 'warning',
					message: 'Update in progress'
				});
				if (success.indexOf('already up-to-date') == -1) restart = true;
				
				/*
				npm.load({
					loglevel: 'warn',
				}, function(error){
					if (error) {
						logger.error(error);
						return;
					}
					npm.commands.update(function(error, success){
						if (error) {
							logger.error(error);
							return;
						}
						if (!success.length) {
							clearInterval(interval);
							if (typeof(callback) == 'function') callback();
							return;
						}
						restart = true;
					});
				});
				*/
				if (restart) self.restart();
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	restart: function(){
		try {
			logger.info('Restarting.');
			events.emit('system.alert', {
				type: 'danger',
				message: 'NodeTV is restarting'
			});
			// Assuming we're using forever
			process.kill(process.pid, 'SIGUSR2');
		} catch(e) {
			logger.error(e.message);
		}
	}
};
module.exports = exports = system;