define('app', ['angular','moment','ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ngTouch','ui.bootstrap','ui.router'], function(angular,moment){
	
	var nessa = angular.module('nessa', ['ngAnimate','ngMessages','ngResource','ngSocketIO','ngStorage','ngTouch','ui.bootstrap','ui.router']);

	nessa.config(function($compileProvider,$logProvider,$tooltipProvider,$urlRouterProvider){
		var debug = (window.location.hostname == 'localhost') ? true : false;
		$urlRouterProvider.when('/', function($state){
			$state.transitionTo('dashboard.shows');
		});
		$logProvider.debugEnabled(debug);
		$compileProvider.debugInfoEnabled(debug);
		$tooltipProvider.options({'appendToBody':true})
	})
	
	/****** Directives ******/
	
	.directive('autofocus', function($log,$parse,$timeout){
		return {
			restrict: 'A',
			link: function($scope,$element,$attrs){
				var model = $parse($attrs.autofocus);
				$scope.$watch(model,function(value){
					if (value === true) { 
						$timeout(function(){
							$element[0].focus(); 
						});
					}
				});
				$element.bind('blur',function(){
					if (model.assign) $scope.$apply(model.assign($scope,false));
				});
			}
		};
	})
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
	.directive('updateTitle', function($rootScope,$timeout) {
		return {
			link: function(scope, element){
				var listener = function(event,toState,toParams,fromState,fromParams){
					var title = 'NodeTV';
					var suffix = (toState.data && toState.data.title) ? ' - '+ toState.data.title : '';
					$timeout(function(){
						element.text(title+suffix);
					});
				};
				$rootScope.$on('$stateChangeStart', listener);
			}
		}
	})
	
	/****** Factories ******/
	
	.factory('$auth', function($http, $localStorage, $location, $log, $q, $rootScope, $sessionStorage){
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
	})
	.factory('$socket', function(socketFactory){
		var socket = socketFactory();
		socket.forward('alert');
		return socket;
	})
	.factory('httpIntercept', function($location,$localStorage,$log,$q){
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
	})
	
	/****** Filters ******/
	
	.filter('bytes', function() {
		return function(bytes, precision) {
			if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0';
			if (typeof precision === 'undefined') precision = 1;
			var	units	= ['bytes','KB','MB','GB','TB','PB','EB','ZB','YB'],
				number	= Math.floor(Math.log(bytes) / Math.log(1024));
			return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
		}
	})
	.filter('downloadName', function(){
		return function(string){
			return string.replace(/\./g, ' ');
		}
	})
	.filter('formatBytes', function(){
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
	})
	.filter('offset', function(){
		return function(input, start){
			start = parseInt(start, 10);
			return input.slice(start);
		};
	})
	.filter('zeroPad', function(){
		return function(n, l){
			if (!l) l = 2;
			var num = parseInt(n, 10), len = parseInt(l, 10);
			if (isNaN(num) || isNaN(len)) return n;
			num = ''+num;
			while (num.length < len) num = '0'+num;
			return num;
		}
	})
	
	
	/****** Config ******/
	
	.config(function($httpProvider,$locationProvider){
		$locationProvider.html5Mode(true).hashPrefix('!');
		$httpProvider.interceptors.push('httpIntercept');
	})
	
	.run(function($http,$log,$rootScope,$state){
		$rootScope.genres = {};
		$rootScope.menu = [];
		$rootScope.settings = {};
		
		$rootScope.$on('$stateChangeStart', function(){
			$http.get('/api/system/settings').success(function(json){
				$rootScope.settings = json;
			});
		});
	});
	
	return nessa;
});