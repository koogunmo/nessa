var fs		= require('fs'),
	mkdirp	= require('mkdirp'),
	path	= require('path'),
	url		= require('url')
	qs		= require('querystring');

// Common helper functions

exports = module.exports = {
	
	isRepack: function(name) {
		return (name.match(/repack|proper/i)) ? true : false;
	},
	
	// Zero-pad a integer to the required length
	zeroPadding: function(num, length) {
		var pad = '000000';
		if (typeof(length) == 'undefined') length = 2;
		return (pad + num).slice(-length);
	},
	
	copyFile: function(from, to, callback) {
		try {
			if (!fs.existsSync(path.dirname(to))) {
				mkdirp.sync(path.dirname(to, 0775));
			}
			
			var rd = fs.createReadStream(from);
			rd.on('error', function(error) {
				logger.error('READ ERROR (%d) - %s', error.errno, error.code);
			});
			
			var wr = fs.createWriteStream(to, {mode: 0775});
			wr.on('error', function(error){
				logger.error('WRITE ERROR (%d) - %s ', error.errno, error.code);
			});
			wr.on('close', callback);
			rd.pipe(wr);
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	// Parse the various formats for TV Shows
	getEpisodeNumbers: function(file) {
		
		var file = file.toString();
		var regexp	= /(?:S|Season)?\s?(\d{1,2})(?:\:[\w\s]+)?[\/\s]?(?:E|Episode|x)?\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}/i;
		var abdexp	= /(\d{4})\D?(\d{2})\D?(\d{2})/i;
		
		if (match = file.match(regexp)) {
			if (match[1] && match[2]) {
				var response = {
					type: 'seasons',
					season: null,
					episodes: []
				};
				var episode	= null;
				response.season = parseInt(match[1], 10);
				
				if (match[3]) {
					for (i = match[2]; i <= match[3]; i++) {
						response.episodes.push(parseInt(i, 10));
					}
				} else {
					// Single episode
					response.episodes.push(parseInt(match[2], 10));
				}
			}
			
		} else if (match = file.match(abdexp)) {
			// Air By Date (e.g. Colbert Report, Daily Show, Craig Ferguson, etc)
			var reponse = {
				type: 'ABD',
				year: match[0],
				month: parseInt(match[1], 10),
				day: parseInt(match[2], 10)
			};
		}
		return (response !== undefined) ? response : false;
	},
	
	moveFile: function(from, to, callback) {
		// Move a file to the correct location
		try {
			if (!fs.existsSync(path.dirname(to))) {
				mkdirp.sync(path.dirname(to, 0775));
			}
			fs.rename(from, to, callback);
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	niceName: function(showid, season, episodes){
		// Is this used?
		if (format = nconf.get('shows:format')) {
			/*
			var replace = {
				'E': helper.zeroPadding(row.episode, 2),
				'N': row.show,
				'S': helper.zeroPadding(row.season, 2),
				'T': row.title,
				'X': path.extname(file).replace('.', '')
			};
			*/
			var name = format.replace(/%(\w)/g, function(match, key){			
				return replace[key];
			});
			
			name = nconf.get('shows:base') + '/' + row.directory + '/' + name;
			
		}
	},
	
	formatMagnet: function(magnet, name){
		try {
			var data = url.parse(magnet, true);
			if (name !== undefined) data.query.dn = name;
			var trackers = [
				'udp://tracker.openbittorent.com:80',
				'udp://open.demonii.com:1337',
				'udp://tracker.publicbt.com:80',
				'udp://tracker.istole.it:80',
				'udp://tracker.ccc.de:80',
			];
			data.query.tr.forEach(function(tracker){
				if (trackers.indexOf(tracker) == -1) {
					trackers.push(tracker);
				}
			});
			data.query.tr = trackers;
			data.query.dn = data.query.dn.replace(/\s/g, '.');
			return 'magnet:?'+qs.unescape(qs.stringify(data.query));
		} catch(e) {
			logger.error(e.message);
			return null;
		}
	}	
};