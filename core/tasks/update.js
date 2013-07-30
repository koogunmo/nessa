/* Check for software updates on Github */

var schedule = require('node-schedule');

/* Run every day at 3am */
var rule = new schedule.RecurrenceRule();
	rule.hour	= 3;
	rule.minute = 0;

schedule.scheduleJob(rule, function(){
	try {
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
			
			/*
			exec('cd ' + process.cwd() + ' && npm update', function(error, stdout, stderr){
				// Update npm packages
			});
			*/
			
			logger.info('Update complete. Restarting server...');
			process.kill(process.pid, 'SIGUSR2');
		});
	} catch(e) {
		logger.error(e.message);
	}
});