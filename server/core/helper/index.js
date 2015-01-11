var extend	= require('xtend'),
	fs		= require('fs'),
	log4js	= require('log4js'),
	mkdirp	= require('mkdirp'),
	parser	= new(require('xml2js')).Parser(),
	path	= require('path'),
	Q		= require('q'),
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
	fileCopy: function(from, to, callback){
		var deferred = Q.defer();
		try {
			if (!fs.existsSync(path.dirname(to))) {
				mkdirp.sync(path.dirname(to, 0775));
			}
			var rd = fs.createReadStream(from);
			rd.on('error', function(error) {
				logger.error('Read Error - %s (%d): %s', error.code, error.errno, from);
				deferred.reject();
			});
			var wr = fs.createWriteStream(to, {mode: 0664});
			wr.on('error', function(error){
				logger.error('Write Error - %s (%d): %s', error.code, error.errno, to);
				deferred.reject();
			});
			wr.on('close', function(){
				deferred.resolve(to)
				if (typeof(callback) == 'function') callback();
			});
			rd.pipe(wr);
		} catch(e) {
			logger.error('helper.fileCopy: %s', e.message);
			deferred.reject(e.message);
		}
		return deferred.promise;
	},
	
	fileMove: function(from, to, callback){
		// Move a file to the correct location
		var deferred = Q.defer();
		try {
			if (!fs.existsSync(path.dirname(to))) mkdirp.sync(path.dirname(to, 0755));
			fs.rename(from, to, function(error){
				if (error){
					logger.error(error);
					deferred.reject(error);
				} else {
					fs.chmod(to, 0644);
					deferred.resolve(to);
				}
				if (typeof(callback) == 'function') callback(error);
			});
		} catch(e) {
			logger.error('helper.fileMove: %s', e.message);
			deferred.reject(e.message);
		}
		return deferred.promise;
	},
	
	listDirectory: function(path, callback){
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
		logger.warn('`helper.getEpisodeNumbers` has been deprecated. Please use `shows.getEpisodeNumbers` instead');
		return require('nodetv-shows').getEpisodeNumbers(file);
	},
	
	// Formatting methods
	zeroPadding: function(num, length) {
		var pad = '000000';
		if (typeof(length) == 'undefined') length = 2;
		return (pad + num).slice(-length);
	},
	
	formatName: function(data){
		logger.error('`helper.formatName` has been deprecated. Please use `shows.getFilename` instead');
		return false;
	},
	formatDirectory: function(name){
		// Sanitize the directory names (remove backslash, foreslash and colon)
		return name.replace(/[\\\:\/]/ig, '-');
	},
	fixFeedUrl: function(url, full){
		logger.warn('`helper.fixFeedUrl` has been deprecated')
		
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
				'udp://9.rarbg.me:2710',
				'udp://ipv4.tracker.harry.lu:80',
				'udp://exodus.desync.com:6969',
				'udp://inferno.demonoid.com:3396',
				'udp://open.demonii.com:1337',
				'udp://tracker.ccc.de:80',
				'udp://tracker.coppersurfer.tk:6969',
				'udp://tracker.istole.it:80',
				'udp://tracker.leechers-paradise.org:6969',
				'udp://tracker.openbittorent.com:80',
				'udp://tracker.publicbt.com:80',
				'udp://tracker.trackerfix.com:80',
				'udp://tracker.yify-torrents.com:80'
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