define('app', ['angular','moment','ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ngTouch','ui.bootstrap','ui.router'], function(angular,moment){
	var nessa = angular.module('nessa', ['ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ui.bootstrap','ui.router']);

	nessa.config(function($compileProvider,$tooltipProvider,$urlRouterProvider){
		$urlRouterProvider.when('/', function($state){
			$state.transitionTo('dashboard');
		});
		$compileProvider.debugInfoEnabled(false);
		$tooltipProvider.options({appendToBody:true})
	})
	
	/****** Factory ******/
	
	nessa.factory('$socket', function(socketFactory){
		var socket = socketFactory();
		socket.forward('alert');
		return socket;
	});
	
	/****** Directives ******/
	
	nessa.directive('lazyLoad', function($document,$log,$timeout,$window){
		return {
			restrict: 'AC',
			link: function($scope,$element,$attr){
				var lazyLoad = function(){
					if ($element.hasClass('lazyLoaded') || $window.innerWidth < 750) return;
					var height	= $window.innerHeight,
						scrollY	= $window.scrollY,
						bottom	= height+scrollY;
					
					if ($element.offset().top >= scrollY && $element.offset().top < bottom){
						if (typeof($scope.progress) == 'function') $scope.progress();
						
						var img = $element.find('img[lazy-src]'),
							src = img.attr('lazy-src');
						
						var poster = new Image();
						poster.onload = function(){
							img.attr('src', poster.src);
							$element.addClass('artwork');
						};
						poster.onerror = function(){
							$log.debug('error', src);
						};
						poster.src = src;
						$element.addClass('lazyLoaded');
					}
				};
		//		$document.bind('lazyload orientationchange resize scroll', lazyLoad);
				$timeout(lazyLoad);
			}
		};
	});
	
	/****** Filters ******/
	
	nessa.filter('bytes', function() {
		return function(bytes, precision) {
			if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0';
			if (typeof precision === 'undefined') precision = 1;
			var	units	= ['bytes','KB','MB','GB','TB','PB','EB','ZB','YB'],
				number	= Math.floor(Math.log(bytes) / Math.log(1024));
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
	
	nessa.filter('offset', function(){
		return function(input, start){
			start = parseInt(start, 10);
			return input.slice(start);
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
			while (num.length < len) num = '0'+num;
			return num;
		}
	});
	
	/****** Factory ******/
	
	nessa.factory('$auth', function($http, $localStorage, $location, $log, $q, $rootScope, $sessionStorage){
		
		$rootScope.$storage = $localStorage;
		
		if ($rootScope.$storage.session) $http.defaults.headers.common['session'] = $rootScope.$storage.session;
		
		var auth = {
			check: function(){
				var deferred = $q.defer();
				if (!$rootScope.$storage.session) {
					deferred.reject({});
				}
				$http.post('/auth/check', {session: $rootScope.$storage.session}).success(function(json, status){
					if (json && json.success){
						auth.update(json);
						deferred.resolve(json);
					} else {
						auth.clear()
						deferred.reject(json);
					}
				}).error(function(json, status){
					auth.clear()
					deferred.reject(json);
				});
				return deferred.promise;
			},
			clear: function(){
				$http.defaults.headers.common['session'] = null;
				$rootScope.$storage.session = null;
				$rootScope.$storage.user = {};
				$rootScope.user = {};
				$rootScope.$broadcast('authenticated', false);
			},
			login: function(username, password, remember){
				var deferred = $q.defer();
				$http.post('/auth/login', {username: username, password: password}).success(function(json){
				//	if (!remember) $rootScope.$session = $sessionStorage;
					if (json.success){
						auth.update(json);
						deferred.resolve(json);
					} else {
						auth.clear();
						deferred.reject(json);
					}
				}).error(function(json){
					auth.clear();
					deferred.reject(json);
				});
				return deferred.promise;
			},
			logout: function(){
				var deferred = $q.defer();
				$http.post('/auth/logout', {session: $rootScope.$storage.session}).then(function(json, status){
					auth.clear();
					deferred.resolve(json);
				}, function(json, status){
					auth.clear();
					deferred.resolve(json);
				});
				return deferred.promise;
			},
			update: function(json){
				$http.defaults.headers.common['session'] = json.session;
				$rootScope.$storage.lastTime = json.lastTime;
				$rootScope.$storage.session = json.session;
				$rootScope.$storage.user = json.user;
				$rootScope.user = $rootScope.$storage.user;
				$rootScope.$broadcast('authenticated', true);
			}
		};
		return auth;
	});
	
	nessa.factory('httpIntercept', function($location,$q){
		return {
			request: function(config){
				return config;
			},
			requestError: function(response){
				if (response.status === 401) $location.url('/login');
				$q.reject(response);
			},
			response: function(response){
				return response;
			},
			responseError: function(rejection){
				if (rejection.status === 401) $location.url('/login');
				$q.reject(rejection);
			}
		}
	});
	
	/****** Config ******/
	
	nessa.config(function($httpProvider, $locationProvider, $stateProvider){
		
		$locationProvider.html5Mode(true).hashPrefix('!');
		$httpProvider.interceptors.push('httpIntercept');
		
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
	
	nessa.run(function($auth, $http, $localStorage, $log, $rootScope, $sessionStorage, $state){
		$rootScope.menu = [];
		$rootScope.genres = {};
		
		$rootScope.$on('$stateChangeStart', function(event, to, toParams, from, fromParams){
			if (to.data) $rootScope.pagetitle = to.data.title;
			$rootScope.stateTo = to;
			$rootScope.stateFrom = from;
		});
		
		$rootScope.$on('$stateChangeSuccess', function(){
			$http.get('/api/system/settings').success(function(json, status){
				$rootScope.settings = json;
			});
		});
	});
	
	return nessa;
});