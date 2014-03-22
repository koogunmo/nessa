'use strict';

define('app', ['angular','socket.io','moment','ngCookies','ngResource','ngRoute','ui.bootstrap','ui.router'], function(angular,io,moment){

	var app = angular.module('nessa', ['ngCookies','ngResource','ngRoute','ui.bootstrap','ui.router']);
	
	app.factory('$socket', function($rootScope) {
		var port = (window.location.port) ? window.location.port : 80;
		var socket = io.connect('http://' + window.location.hostname + ':' + port, {
			'connect timeout': 2000,
			'max reconnection attempts': 5,
			'sync disconnect on unload': true
		});
		var handler = {
			events: [],
			on: function(eventName, callback){
				// this is the bastard causing multiple modals to spawn
				// probably other issues too
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
	}).run(function($rootScope, $location){
		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
			$rootScope.pagetitle = toState.data.title;
		});
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
	
	app.config(function($stateProvider, $urlRouterProvider, $routeProvider, $locationProvider, $httpProvider){
		
		$locationProvider.html5Mode(true).hashPrefix('!');
		
		var checkInstalled = function($q, $timeout, $http, $location, $rootScope){
			// Initialize a new promise
			var deferred = $q.defer();
			// Make an AJAX call to check if installer has been run
			$http.get('/installed').success(function(response){
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

		var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
			// Initialize a new promise
			var deferred = $q.defer();
			// Make an AJAX call to check if the user is logged in
			$http.get('/loggedin').success(function(response){
				if (response.authenticated) {
					$timeout(deferred.resolve, 0);
				} else {
					$timeout(function(){
						deferred.reject();
					}, 0);
					$location.url('/login');
				}
			});
			return deferred.promise;
		};
		
		$httpProvider.responseInterceptors.push(function($q, $location){
			return function(promise) {
				return promise.then(
					// Success: just return the response
					function(response){
						return response;
					},
					// Error: check the error status to get only the 401
					function(response) {
						if (response.status === 401) $location.url('/login');
						return $q.reject(response);
					}
				);
			}
		});
		
		$urlRouterProvider.otherwise('/dashboard');
		
		$stateProvider.state('dashboard', {
			url: '/dashboard',
			controller: 'homeCtrl',
			templateUrl: '/views/partials/dashboard.html',
			data: {
				title: 'Home'
			}
		}).state('downloads', {
			url: '/downloads',
			controller: 'downloadsCtrl',
			templateUrl: '/views/partials/downloads.html',
			data: {
				title: 'Downloads'
			}
		}).state('downloads.add', {
			url: '/add',
			onEnter: function($state, $modal){
				$modal.open({
					controller: 'downloadAddCtrl',
					templateUrl: '/views/modal/download/add.html'
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('download.info', {
			url: '/:id',
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					controller: 'downloadAddCtrl',
					templateUrl: '/views/modal/download/add.html',
					resolve: {
						id: function(){
							return $stateParams.id
						}
					}
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('install', {
			
		}).state('shows', {
			url: '/shows',
			controller: 'showsCtrl',
			templateUrl: '/views/partials/shows.html',
			data: {
				title: 'Shows'
			}
		}).state('shows.add', {
			url: '/add',
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					templateUrl: '/views/modal/show/search.html',
					controller: 'searchCtrl',
					windowClass: 'modal-add'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
			
		}).state('shows.detail', {
			url: '/:showid',
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					templateUrl: '/views/modal/show/detail.html',
					controller: 'showCtrl',
					backdrop: 'static',
					keyboard: false,
					windowClass: 'modal-show',
					resolve: {
						tvdb: function(){
							return $stateParams.showid
						}
					}
				}).result.then(function(result){
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
			controller: 'matchCtrl',
			templateUrl: '/views/partials/match.html',
			data: {
				title: 'Unmatched Shows'
			}
			
		}).state('settings', {
			url: '/settings',
			controller: 'settingsCtrl',
			templateUrl: '/views/partials/settings.html',
			data: {
				title: 'Settings'
			}
		});
	});
		
	return app;
});