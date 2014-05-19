'use strict';

define('app', ['angular','socket.io','moment','ngCookies','ngResource','ngStorage','ngTouch','ui.bootstrap','ui.router'], function(angular,io,moment){
	var app = angular.module('nessa', ['ngCookies','ngResource','ngStorage','ui.bootstrap','ui.router']);
	
	app.factory('$auth', function($cookieStore, $http, $localStorage, $location, $q, $rootScope, $sessionStorage){
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
	
	app.factory('nessaHttp', function($location, $q, $rootScope){
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
				if (response.status === 401) $location.url('/login');
				$q.reject(rejection);
			}
		}
	});
		
	app.factory('$socket', function($rootScope) {
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
	
	app.filter('moment', function() {
		return function(dateString, format) {
			return moment(dateString).format(format);
		};
	});
	
	app.filter('formatBytes', function(){
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
	
	app.filter('downloadName', function(){
		return function(string){
			return string.replace(/\./g, ' ');
		}
	});
	
	app.filter('traktPoster', function(){
		return function(string){
			return string.replace(/\.jpg$/ig, '-138.jpg');
		}
	});
	
	app.filter('zeroPad', function(){
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
	
	app.filter('bytes', function() {
		return function(bytes, precision) {
			if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0';
			if (typeof precision === 'undefined') precision = 1;
			var	units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
				number = Math.floor(Math.log(bytes) / Math.log(1024));
			
			return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
		}
	});
	
	app.config(function($controllerProvider, $httpProvider, $locationProvider, $stateProvider, $urlRouterProvider){
		$locationProvider.html5Mode(true).hashPrefix('!');
		var checkInstalled = function($q, $timeout, $http, $location, $rootScope){
			// Initialize a new promise
			var deferred = $q.defer();
			// Make an AJAX call to check if installer has been run
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
				
		$httpProvider.interceptors.push('nessaHttp');
		
		$urlRouterProvider.otherwise('/dashboard');
		
		$stateProvider.state('login', {
			url: '/login',
			controller: 'loginCtrl',
			templateUrl: 'views/partials/login.html',
			data: {
				secure: false,
				title: 'Login'
			},
			resolve: {
				load: function($q, $state){
					var deferred = $q.defer();
					require(['controllers/loginCtrl'], function(construct){
						$controllerProvider.register('loginCtrl', construct);
						deferred.resolve();
					});
					return deferred.promise;
				}
			}
		}).state('logout', {
			url: '/logout',
			data: {
				secure: false
			},
			onEnter: function($auth, $location){
				$auth.logout().then(function(){
					$location.path('/login');
				});
			}
		}).state('dashboard', {
			url: '/dashboard',
			controller: 'homeCtrl',
			templateUrl: 'views/partials/dashboard.html',
			data: {
				secure: true,
				title: 'Home'
			}
		}).state('downloads', {
			url: '/downloads',
			controller: 'downloadsCtrl',
			templateUrl: 'views/partials/downloads.html',
			data: {
				secure: true,
				title: 'Downloads'
			}
		}).state('downloads.add', {
			url: '/add',
			data: {
				secure: true
			},
			onEnter: function($state, $modal){
				$modal.open({
					controller: 'downloadAddCtrl',
					templateUrl: 'views/modal/download/add.html'
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				}, function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('downloads.info', {
			url: '/{id:[0-9]{1,}}',
			data: {
				secure: true
			},
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					controller: 'downloadCtrl',
					templateUrl: 'views/modal/download/settings.html'
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				}, function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('install', {
			url: '/install',
			controller: 'installCtrl',
			templateUrl: 'views/partials/install.html',
			data: {
				secure: false,
				title: 'Install'
			},
			resolve: {
				load: function($q, $state){
					var deferred = $q.defer();
					require(['controllers/installCtrl'], function(construct){
						$controllerProvider.register('installCtrl', construct);
						deferred.resolve();
					});
					return deferred.promise;
				}
			}
		}).state('shows', {
			url: '/shows',
			controller: 'showsCtrl',
			templateUrl: 'views/partials/shows.html',
			data: {
				secure: true,
				title: 'Shows'
			},
			resolve: {
				load: function($q, $state){
					var deferred = $q.defer();
					require(['controllers/showsCtrl'], function(construct){
						$controllerProvider.register('showsCtrl', construct);
						deferred.resolve();
					});
					return deferred.promise;
				}
			}
		}).state('shows.add', {
			url: '/add',
			data: {
				secure: true
			},
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					templateUrl: 'views/modal/show/search.html',
					controller: 'searchCtrl',
					windowClass: 'modal-add'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
			
		}).state('shows.detail', {
			url: '/{showid:[0-9]+}',
			data: {
				secure: true
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/modal/show/detail.html',
					controller: 'showCtrl',
					backdrop: 'static',
					windowClass: 'modal-show',
					resolve: {
						load: function($q, $state){
							var deferred = $q.defer();
							require(['controllers/showCtrl'], function(construct){
								$controllerProvider.register('showCtrl', construct);
								deferred.resolve();
							});
							return deferred.promise;
						}
					}
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('shows.match', {
			url: '/match',
			data: {
				secure: true,
				title: 'Unmatched Shows'
			},
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/show/match.html',
					controller: 'matchCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('settings', {
			url: '/settings',
			controller: 'settingsCtrl',
			templateUrl: 'views/partials/settings.html',
			data: {
				secure: true,
				title: 'Settings'
			},
			resolve: {
				load: function($q, $state){
					var deferred = $q.defer();
					require(['controllers/settingsCtrl'], function(construct){
						$controllerProvider.register('settingsCtrl', construct);
						deferred.resolve();
					});
					return deferred.promise;
				}
			}
		}).state('settings.user', {
			abstract: true,
			url: '/user'
		}).state('settings.user.add', {
			url: '/add',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('settings');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		}).state('settings.user.edit', {
			url: '/edit/{id:[0-9a-f]{24}}',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('settings');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		});
	});
	
	app.run(function($auth, $cookieStore, $localStorage, $location, $rootScope, $sessionStorage, $socket, $state){
		$rootScope.downloads = null;
		
		$socket.on('download.list', function(data){
			$rootScope.downloads = data;
		});
		
		$socket.on('shows.list', function(shows){
			$rootScope.shows = shows;
			$(document).trigger('lazyload');
		});
		
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
	return app;
});