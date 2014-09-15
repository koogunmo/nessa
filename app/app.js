define('app', ['angular','socket.io','moment','ngResource','ngStorage','ngTouch','ui.bootstrap','ui.router'], function(angular,io,moment){
	
	var nessa = angular.module('nessa', ['ngResource','ngStorage','ui.bootstrap','ui.router']);
	
	/****** Filter ******/
	
	nessa.filter('bytes', function() {
		return function(bytes, precision) {
			if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0';
			if (typeof precision === 'undefined') precision = 1;
			var	units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
				number = Math.floor(Math.log(bytes) / Math.log(1024));
			
			return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
		}
	});
	
	nessa.filter('downloadName', function(){
		return function(string){
			return string.replace(/\./g, ' ');
		}
	});
	
	nessa.filter('formatBytes', function(){
		return function(bytes, si) {
			if (bytes == 0) return '0.0B';
			if (!si) si = true;
			var value = (si) ? 1000 : 1024;
			// Yes, this is excessive. No, I don't care.
			var sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
			var i = parseInt(Math.floor(Math.log(bytes) / Math.log(value)));
			if (i == 0) { return (bytes / Math.pow(value, i))+' '+sizes[i]; }
			return (bytes / Math.pow(value, i)).toFixed(1)+' '+sizes[i];
		}
	});
	
	nessa.filter('moment', function() {
		return function(dateString, format) {
			return moment(dateString).format(format);
		};
	});
	
	nessa.filter('traktPoster', function(){
		return function(string){
			return string.replace(/\.jpg$/ig, '-138.jpg');
		}
	});
	
	nessa.filter('zeroPad', function(){
		return function(n, l){
			if (!l) l = 2;
			var num = parseInt(n, 10), len = parseInt(l, 10);
			if (isNaN(num) || isNaN(len)) return n;
			num = ''+num;
			while (num.length < len) {
				num = '0'+num;
			}
			return num;
		}
	});
	
	/****** Factory ******/
	
	nessa.factory('$auth', function($http, $localStorage, $location, $q, $rootScope, $sessionStorage){
		var auth = {
			check: function(){
				var deferred = $q.defer();
				$rootScope.$storage = $localStorage;
				
				$http.post('/api/auth/check', {session: $rootScope.$storage.session}).success(function(json, status){
					if (status == 200 && json.success){
						$rootScope.$storage.lastTime = json.lastTime;
						deferred.resolve(status);
					} else {
						$rootScope.$storage.session = false;
						deferred.reject(json.messages);
					}
				}).error(function(json, status){
					deferred.resolve(status);
				});
				return deferred.promise;
			},
			
			login: function(username, password, remember){
				var deferred = $q.defer();
				$http.post('/api/auth/login', {username: username, password: password}).success(function(json, status){
					if (json.success){
						$rootScope.$storage.lastTime = json.lastTime;
						$rootScope.$storage.session = json.session;
						deferred.resolve();
					} else {						
						deferred.reject(401);
					}
				}).error(function(json, status){
					deferred.reject(status);
				});
				return deferred.promise;
			},
			
			logout: function(){
				var deferred = $q.defer();
				$http.post('/api/auth/logout', {session: $rootScope.$storage.session}).success(function(json, status){
					$rootScope.$storage.session = false;
					deferred.resolve();
				}).error(function(json, status){
					$rootScope.$storage.session = false;
					deferred.resolve();
				});
				return deferred.promise;
			}
		};
		return auth;
	});
	
	nessa.factory('nessaHttp', function($location, $q, $rootScope){
		return {
			request: function(config){
			//	if ($rootScope.$storage) config.headers['X-Session'] = $rootScope.$storage.session;
				return config || $q.when(config);
			},
			requestError: function(rejection){
				if (response.status === 401) $location.url('/login');
				$q.reject(rejection);
			},
			response: function(response){
				return response || $q.when(response);
			},
			responseError: function(rejection){
				if (rejection.status === 401) $location.url('/login');
				$q.reject(rejection);
			}
		}
	});
	
	nessa.factory('$socket', function($rootScope) {
		var port = '';
		if (window.location.protocol == 'https:'){
			port = 443;
		} else {
			port = (window.location.port) ? window.location.port : 80;
		}
		var socket = io.connect(window.location.protocol+'//'+window.location.hostname+':'+port, {
			'connect timeout': 2000,
			'max reconnection attempts': 5,
			'sync disconnect on unload': true
		});
		var handler = {
			events: [],
			on: function(eventName, callback){
				socket.on(eventName, function(){  
					var args = arguments;
					$rootScope.$apply(function(){
						if (callback) callback.apply(socket, args);
					});
				});
			},
			once: function(eventName, callback){
				socket.once(eventName, function(){  
					var args = arguments;
					$rootScope.$apply(function(){
						if (callback) callback.apply(socket, args);
					});
				});
			},
			emit: function(eventName, data, callback){	
				socket.emit(eventName, data, function(){
					var args = arguments;
					$rootScope.$apply(function(){
						if (callback) callback.apply(socket, args);
					});
				});
			},
			removeAllListeners: function(){
				return socket.removeAllListeners();
			}
		};
		return handler;
	});
	
	/****** Config ******/
	
	nessa.config(function($httpProvider, $locationProvider, $stateProvider){
		$httpProvider.interceptors.push('nessaHttp');
		
		$locationProvider.html5Mode(true).hashPrefix('!');
		
		var checkInstalled = function($q, $timeout, $http, $location, $rootScope){
			var deferred = $q.defer();
			$http.get('/api/installed').success(function(response){
				if (response.installed) {
					$timeout(deferred.resolve, 0);
				} else {
					$timeout(function(){
						deferred.reject();
					}, 0);
					$location.url('/install');
				}
			});
			return deferred.promise;
		};
		
	});
	
	nessa.run(function($auth, $localStorage, $location, $rootScope, $sessionStorage, $socket, $state){
		$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
			if (toState.data.secure){
				$auth.check().then(function(success){
					$rootScope.authenticated = true;
					$rootScope.pagetitle = toState.data.title;
				}, function(error){
					event.preventDefault();
					$rootScope.authenticated = false;
					$state.transitionTo('login');
				});
			} else {
				if (toState.name == 'login') {
					$auth.check().then(function(){
						$rootScope.authenticated = true;
						$location.path('/dashboard');
					}, function(){
						$rootScope.authenticated = false;
					});
				}
				$rootScope.pagetitle = toState.data.title;
			}
		});
	});
	
	return nessa;
});