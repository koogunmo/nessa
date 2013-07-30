module.exports = exports = {
	
	copy: function(from, to, callback) {
		var rd = fs.createReadStream(from);
		rd.on('error', function(error) {
			logger.error('READ ERROR (%d) - %s', error.errno, error.code);
		});
		
		var wr = fs.createWriteStream(to);
		wr.on('error', function(error){
			logger.error('WRITE ERROR (%d) - %s ', error.errno, error.code);
		});
		wr.on('close', callback);
		rd.pipe(wr);
	},
	
	rename: function(from, to, callback) {
		// rename a file, leaving it in the same location
		try {
			var dir = path.dirname(from);
			fs.rename(from, dir + '/' + to, callback);
		} catch(e) {
			logger.error(e.message);
		}
	}
	
};