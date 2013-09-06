var git = require('gitty');

var system = {
	update: function(){
		try {
			var repo = git(process.cwd());
			repo.pull('origin', 'master', function(error, success){
				if (error) {
					logger.error(error);
					return;
				}
				if (success.indexOf('already up-to-date') == 0) {
					return;
				}
				console.log('Update installed. Restarting...');
				system.restart();
			});
		} catch(e) {
			logger.error(e.message);
		}
	},
	restart: function(){
		try {
			process.kill(process.pid, 'SIGUSR2');
		} catch(e) {
			logger.error(e.message);
		}
	}
};
module.exports = exports = system;