var git = require('gitty');

module.exports = exports = {
	update: function(){
		var self = this;
		try {
			git.pull('origin', 'master', function(error, success){
				
			});
			
			/*
			var exec = require('child_process').exec;
			exec('git --git-dir=' + process.cwd() + '/.git pull origin', function(error, stdout, stderr){
				if (error) {
					logger.error(error);
					return;
				}
				
				if (stdout.indexOf('Already up-to-date') == 0) {
					logger.info('No update available');
					return;
				}
				logger.info('Update complete. Restarting server...');
				self.restart()
			});
			*/
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