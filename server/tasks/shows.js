/* Check for new episodes */

module.exports = function(app,db,socket){
	try {
		var schedule	= require('node-schedule');
		var shows		= plugin('showdata');
		
		/* Every 30 mins */
		var rule = new schedule.RecurrenceRule();
			rule.minute		= [0,30];
		
		schedule.scheduleJob(rule, function(){
			shows.getLatest();
		});
		shows.getLatest();
	} catch(e){
		logger.error(e.message)
	}
}