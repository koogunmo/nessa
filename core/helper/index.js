var fs		= require('fs'),
	mkdirp	= require('mkdirp'),
	path	= require('path'),
	qs		= require('querystring'),
	url		= require('url'),
	extend	= require('xtend');

// Common helper functions

exports = module.exports = {
	
	// FS methods
	fileCopy: function(from, to, callback) {
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
	
	fileMove: function(from, to, callback) {
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
	
	copyFile: function(from, to, callback) {
		console.warn('helper.copyFile is deprecated');
		return this.fileCopy(from, to, callback);
	},
	
	moveFile: function(from, to, callback) {
		console.warn('helper.moveFile is deprecated');
		return this.fileMove(from, to, callback);
	},
	
	
	// RegExp methods
	getEpisodeNumbers: function(file) {
		
		var file = file.toString();
		var regexp	= /(?:S|Season|\w+)?\s?(\d{1,2})(?:\:[\w\s]+)?[\/\s]?(?:E|Episode|x|\w+)\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}/i;
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
			// Air By Date (e.g. Colbert Report, Daily Show, Neighbours, etc)
			var reponse = {
				type: 'ABD',
				year: match[0],
				month: parseInt(match[1], 10),
				day: parseInt(match[2], 10)
			};
		}
		return (response !== undefined) ? response : false;
	},
	
	// Formatting methods
	zeroPadding: function(num, length) {
		var pad = '000000';
		if (typeof(length) == 'undefined') length = 2;
		return (pad + num).slice(-length);
	},
	
	formatName: function(data){
		var defaults = {
			format: nconf.get('shows:format'),
			season: null,
			episodes: [],
			ext: null
		};
		var values = extend(defaults, data);
		var token = {
			'E': null,
			'S': null,
			'T': null,
			'X': null,
		};
		if (values.episodes.length > 1) {
			values.episodes.sort();
			token.E = helper.zeroPadding(values.episodes[0].episode)+'-'+helper.zeroPadding(values.episodes[values.episodes.length-1].episode);
			var titles = [];
			values.episodes.forEach(function(episode){
				titles.push(episode.title.replace('/', '-'));
			});
			token.T = titles.join('; ');
		} else {
			token.E = helper.zeroPadding(values.episodes[0].episode);
			token.T = values.episodes[0].title.replace('/', '-');
		}
		token.S = helper.zeroPadding(values.season);
		token.X = values.ext.replace(/^\./, '');
		
		return values.format.replace(/%(\w)/g, function(match, key){			
			return token[key];
		});
	},
	
	// Torrent methods
	
	isRepack: function(name) {
		return (name.match(/repack|proper/i)) ? true : false;
	},
	
	formatMagnet: function(magnet, name){
		// Add extra trackers to the torrent before adding
		try {
			var data = url.parse(magnet, true);
			if (name !== undefined) data.query.dn = name;
			var trackers = [
				'udp://open.demonii.com:1337',
				'udp://tracker.openbittorent.com:80',
				'udp://tracker.publicbt.com:80',
				'udp://tracker.istole.it:80',
				'udp://tracker.ccc.de:80',
				'udp://tracker.coppersurfer.tk:6969'
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