var fs		= require('fs'),
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
		var rd = fs.createReadStream(from);
		rd.on('error', function(error) {
			logger.error('READ ERROR (%d) - %s', error.errno, error.code);
		});
		
		var wr = fs.createWriteStream(to, {mode: 0664});
		wr.on('error', function(error){
			logger.error('WRITE ERROR (%d) - %s ', error.errno, error.code);
		});
		wr.on('close', callback);
		rd.pipe(wr);
	},
	
	// Parse the various formats for TV Shows
	getEpisodeNumbers: function(file) {
		
		/* Original version of the Season/Episode RegEx*/
		/*
		var regexp	= /S([\d]+)E([\d\-]+)|([\d]+)x([\d\-]+)|Season (\d+)\/Episode ([\d\-]+)|(\d{1,2})([\d]{2})/i;
		if (match[1] && match[2]) {
			response.season = parseInt(match[1], 10);
			episode = match[2];
		} else if (match[3] && match[4]) {
			response.season = parseInt(match[3], 10);
			episode = match[4];
		} else if (match[5] && match[6]) {{
			response.season = parseInt(match[5], 10)
			episode = match[6];
		} else if (match[7] && match[8]) {
		*/
		
		var regexp	= /(S|Season\s)?(\d{1,2})(E|\/Episode\s|x)?([\d\-]{2,})/i;
		var abdexp	= /(\d{4})\D(\d{2})\D(\d{2})/i;
		
		if (match = file.match(regexp)) {
			var response = {
				type: 'seasons',
				season: null,
				episodes: []
			};
			var episode	= null;
			
			if (match[1] && match[3]) {
				response.season = parseInt(match[1], 10);
				episode = match[3];
				if (episode.match('-')) {
					// Multipart episode
					var split	= episode.split('-'),
						start	= parseInt(split[0], 10)
						stop	= parseInt(split[split.length-1], 10);
					
					for (i = start; i <= stop; i++) {
						response.episodes.push(i);
					}
				} else {
					// Single episode
					response.episodes.push(parseInt(episode, 10));
				}
				// TO DO: Add Air-By-Date support
				return response;
			} else {
				return false;
			}
		} else if (match = file.match(abdexp)) {
			// Air By Date (e.g. Colbert, Daily Show, Craig Ferguson)
			console.log(match);
			var reponse = {
				type: 'ABD',
				year: match[0],
				month: parseInt(match[1], 10),
				day: parseInt(match[2], 10)
			};
			return response;
		}
		return false;
	},
	
	moveFile: function(from, to, callback) {
		// Move a file to the correct location
		try {
			if (!fs.existsSync(path.dirname(to))) {
				fs.mkdirSync(path.dirname(to, 0775));
			}
			fs.rename(from, to, callback);
		} catch(e) {
			logger.error(e.message);
		}
	},
	
	niceName: function(showid, season, episodes){
		
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