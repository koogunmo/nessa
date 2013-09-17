var git = require('gitty'),
	npm = require('npm');

var system = {
	update: function(callback){
		try {
			var repo = git(process.cwd());
			repo.pull('origin', 'master', function(error, success){
				if (error) {
					logger.error(error);
					return;
				}
				var restart = (success.indexOf('already up-to-date') == 0) ? false : true;
				
				var interval = setInterval(function(){
					if (restart) {
						console.log('Updates installed. Restarting...');
						system.restart();
					}
				}, 5000);
				
				npm.config.set('loglevel', 'warn');
				npm.load(function(error){
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
					})
				});
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	restart: function(){
		try {
			// Assuming we're using forever
			process.kill(process.pid, 'SIGUSR2');
		} catch(e) {
			logger.error(e.message);
		}
	}
};
module.exports = exports = system;