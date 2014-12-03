var extend	= require('xtend'),
	fs		= require('fs'),
	log4js	= require('log4js'),
	mkdirp	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	path	= require('path'),
	qs		= require('querystring'),
	request	= require('request'),
	url		= require('url');

log4js.configure({
	appenders: [{
		type: 'console'
	}],
	replaceConsole: true
});
var logger = log4js.getLogger('nodetv-helper');


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
				logger.error('Read Error - %s (%d): %s', error.code, error.errno, from);
			});
			var wr = fs.createWriteStream(to, {mode: 0664});
			wr.on('error', function(error){
				logger.error('Write Error - %s (%d): %s', error.code, error.errno, to);
			});
			wr.on('close', function(){
				if (typeof(callback) == 'function') callback();
			});
			rd.pipe(wr);
		} catch(e) {
			logger.error('helper.fileCopy: %s', e.message);
		}
	},
	
	fileMove: function(from, to, callback) {
		// Move a file to the correct location
		try {
			if (!fs.existsSync(path.dirname(to))) {
				mkdirp.sync(path.dirname(to, 0755));
			}
			fs.rename(from, to, function(error){
				fs.chmod(to, 0644);
				if (typeof(callback) == 'function') callback(error);
			});
		} catch(e) {
			logger.error('helper.fileMove: %s', e.message);
		}
	},
	
	copyFile: function(from, to, callback) {
		logger.warn('helper.copyFile is deprecated');
		return this.fileCopy(from, to, callback);
	},
	
	moveFile: function(from, to, callback) {
		logger.warn('helper.moveFile is deprecated');
		return this.fileMove(from, to, callback);
	},
	
	listDirectory: function(path, callback) {
		var self = this;
		fs.readdir(path, function(error, list){
			if (error) logger.error(error);
			if (list){
				list.forEach(function(item){
					var fullpath = path + '/' + item;
					fs.lstat(fullpath, function(error, stats){
						if (error) logger.error(error);
						
						if (item.match(/^\./)) return;
						if (stats.isDirectory()){
							return self.listDirectory(fullpath, callback);
						} else if (stats.isFile() || stats.isSymbolicLink()) {
							var record = {
								path: fullpath,
								stat: stats
							};
							if (typeof(callback) == 'function') callback(error, record);
						}
					});
				});
			}
		});
	},
	
	// RegExp methods
	getEpisodeNumbers: function(file) {
		
		var file = file.toString();
		var regexp	= /(?:S|Season)?\s?(\d{1,2})(?:\:[\w\s]+)?[\/\s]?(?:E|Episode|x)\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}/i;
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
		try {
			var defaults = {
				format: nconf.get('media:shows:format'),
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
				values.episodes.sort(function(a,b){
					if (a.episode < b.episode) return -1;
					if (a.episode > b.episode) return 1;
					return 0;
				});
				token.E = helper.zeroPadding(values.episodes[0].episode)+'-'+helper.zeroPadding(values.episodes[values.episodes.length-1].episode);
				var titles = [];
				values.episodes.forEach(function(episode){
					if (episode.title.indexOf('Episode') != 0) titles.push(episode.title.replace('/', '-'));
				});
				token.T = (titles.length) ? titles.join('; ') : '';
			} else {
				token.E = helper.zeroPadding(values.episodes[0].episode);
				if (values.episodes[0].title.indexOf('Episode') != 0){
					token.T = values.episodes[0].title.replace('/', '-');
				} else {
					token.T = '';
				}
			}
			token.S = helper.zeroPadding(values.season);
			token.X = values.ext.replace(/^\./, '');
			
			// TO DO: fix names that look like 'Episode 01 - '
			
			return values.format.replace(/%(\w)/g, function(match, key){			
				return token[key];
			});
		} catch(e) {
			logger.error('helper.formatName: %s', e.message);
		}
	},
	formatDirectory: function(name){
		// Sanitize the directory names
		return name.replace(/\/\:/g, '-');
	},
	fixFeedUrl: function(url, full){
		var full = (typeof(full) == 'undefined') ? false: true;
		if (url.indexOf('tvshowsapp.com') >= 0) {
			var oldurl = decodeURIComponent(url);
			userAgent = 'TVShows 2 (http://tvshowsapp.com/)';
			/*
			if (match = oldurl.match(/([\w\s\-\.\']+)$/i)){
				url = 'http://tvshowsapp.com/feeds/cache/'+encodeURI(match[1]);
			}
			*/
			if (full && url.indexOf('.full.xml') == -1) {
				url = url.replace(/\.xml$/, '.full.xml');
			}
		}
		return url;
	},
	parseFeed: function(url, since, callback){
		var helper = this;
		try {
			var userAgent = 'NodeTV '+global.pkg.version+' (http://greebowarrior.github.io/nessa/)';
			if (url.indexOf('tvshowsapp.com') >= 0) {
				url = helper.fixFeedUrl(url);
				userAgent = 'TVShows 2 (http://tvshowsapp.com/)';
			}
			var options = {
				url: url,
				headers: {
					'User-Agent': userAgent
				}
			};
			request.get(options, function(error, req, xml){
				if (error || req.statusCode != 200) return;
				try {
					parser.parseString(xml, function(error, json){
						if (error) {
							logger.error(error);
							return;
						}
						if (!json || !json.rss.channel[0].item) return;
						json.rss.channel[0].item.forEach(function(item){
							if (since) {
								var published = new Date(item.pubDate[0]).getTime();
								if (published < since) return;
							}
							var sources = [];
							if (item.enclosure) sources.push(item.enclosure[0]['$'].url);
							if (item.link) sources.push(item.link[0]);
							if (item.guid) sources.push(item.guid[0]['_']);
							
							var magnet = null;
							sources.forEach(function(source){
								if (magnet) return;
								if (source.indexOf('magnet') == 0) {
									magnet = source;
									return;
								}
							});
							var res = helper.getEpisodeNumbers(item.title[0]);
							var response = {
								season: res.season,
								episodes: res.episodes,
								hd: helper.isHD(item.title[0]),
								repack: helper.isRepack(item.title[0]),
								hash: helper.getHash(magnet)
							};
							if (typeof(callback) == 'function') callback(null, response);
						});
					});
				} catch(e){
					logger.error('XML Parser error', url, e.message);
				}
			});
		} catch(e) {
			logger.error('helper.parseFeed: %s', e.message);
		}
	},
	
	// Torrent methods
	
	isHD: function(name){
		return (name.match(/720p|1080p/i)) ? true : false;
	},
	
	isRepack: function(name) {
		return (name.match(/repack|proper/i)) ? true : false;
	},
	
	getHash: function(magnet){
		if (match = magnet.match(/btih\:([\w]{32,40})/i)){
			return match[1].toUpperCase();
		}
		return false;
	},
	
	createMagnet: function(hash, name){
		try {
			if (!hash) return;
			if (!name) name = hash;
			var trackers = [
				'udp://exodus.desync.com:6969/announce',
				'http://inferno.demonoid.com:3396',
				'udp://open.demonii.com:1337',
				'udp://tracker.ccc.de:80',
				'udp://tracker.coppersurfer.tk:6969',
				'udp://tracker.istole.it:80',
				'udp://tracker.leechers-paradise.org:6969/announce',
				'udp://tracker.openbittorent.com:80',
				'udp://tracker.publicbt.com:80',
				'udp://tracker.trackerfix.com:80',
				'udp://tracker.yify-torrents.com:80/announce'
			];
			var tr = [];
			trackers.forEach(function(tracker){
				tr.push('tr='+tracker+'/announce');
			});
			return 'magnet:?xt=urn:btih:'+hash+'&dn='+name+'&'+tr.join('&');
		} catch(e){
			logger.error('helper.createMagnet: %s', e.message);
		}
	}
};