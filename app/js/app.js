define('app', ['angular','moment','ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ngTouch','ui.bootstrap','ui.router'], function(angular,moment){
	
	var nessa = angular.module('nessa', ['ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ngTouch','ui.bootstrap','ui.router']);

	nessa.config(function($compileProvider,$tooltipProvider,$urlRouterProvider){
		$urlRouterProvider.when('/', function($state){
			$state.transitionTo('dashboard');
		});
		$compileProvider.debugInfoEnabled(false);
		$tooltipProvider.options({'appendToBody':true})
	})
	
	/****** Factory ******/
	
	.factory('$socket', function(socketFactory){
		var socket = socketFactory();
		socket.forward('alert');
		return socket;
	})
	
	/****** Directives ******/
	
	.directive('lazyLoad', function($document,$log,$timeout,$window){
		return {
			restrict: 'AC',
			link: function($scope,$element,$attr){
				var lazyLoad = function(){
					if ($element.hasClass('lazyLoaded') || $window.innerWidth < 750) return;
					var height	= $window.innerHeight,
						scrollY	= $window.scrollY,
						bottom	= height+scrollY;
					
					var img = $element.find('img[lazy-src]'), src = img.attr('lazy-src');
					var poster = new Image();
					poster.onload = function(){
						img.attr('src', poster.src);
						$element.addClass('lazyLoaded');
					};
					poster.onerror = function(){
					//	$log.error('Error:', src);
					};
					poster.src = src;
				};
				$timeout(lazyLoad);
			}
		};
	})
	.directive('updateTitle', function($rootScope, $timeout) {
		return {
			link: function(scope, element){
				var listener = function(event,toState,toParams,fromState,fromParams){
					var title = 'NodeTV';
					var suffix = (toState.data && toState.data.title) ? ' - '+ toState.data.title : '';
					// Set asynchronously so page changes before title does
					$timeout(function(){
						element.text(title+suffix);
					});
				};
				$rootScope.$on('$stateChangeStart', listener);
			}
		}
	})
	
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
			'clear': function(){
				delete $http.defaults.headers.common['session'];
				delete $rootScope.$storage.session;
				delete $rootScope.$storage.user;
				delete $rootScope.user;
			},
			'login': function(username, password){
				var deferred = $q.defer();
				$http.post('/auth/login', {'username':username,'password':password}).success(function(json){
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
			'logout': function(){
				var deferred = $q.defer();
				$http.post('/auth/logout',{'session':$rootScope.$storage.session}).then(function(json){
					auth.clear();
					deferred.resolve();
				}, function(json, status){
					auth.clear();
					deferred.resolve();
				});
				return deferred.promise;
			},
			'update': function(json){
				$http.defaults.headers.common['session'] = json.session;
				$rootScope.$storage.session = json.session;
				$rootScope.$storage.user = json.user;
				$rootScope.user = $rootScope.$storage.user;
			}
		};
		return auth;
	});
	
	nessa.factory('httpIntercept', function($location,$localStorage,$log,$q){
		
		return {
			'request': function(config){
				if ($localStorage.session){
					if (!config.headers) config.headers = {};
					if (!config.headers.session) config.headers.session = $localStorage.session;
				}
				return config;
			},
			'response': function(response){
				return response;
			},
			'responseError': function(rejection){
				if (rejection.status === 401) $location.url('/login');
				if (rejection.status === 418) $location.url('/install');
				return $q.reject(rejection);
			}
		}
	});
	
	/****** Config ******/
	
	nessa.config(function($httpProvider, $locationProvider, $stateProvider){
		
		$locationProvider.html5Mode(true).hashPrefix('!');
		$httpProvider.interceptors.push('httpIntercept');
		/*
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
		*/
	});
	
	nessa.run(function($http,$log,$rootScope,$state){
		$rootScope.genres = {};
		$rootScope.menu = [];
		$rootScope.settings = {};
		
		$rootScope.$on('$stateChangeSuccess', function(){
			/*
			$http.get('/api/system/settings').success(function(json, status){
				$rootScope.settings = json;
			});
			*/
		});
	});
	
	return nessa;
});