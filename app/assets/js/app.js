'use strict';

define('app', ['angular','socket.io','moment','ngCookies','ngResource','ngRoute','ui.bootstrap'], function(angular,io,moment){

	var app = angular.module('nessa', ['ngCookies','ngResource','ngRoute','ui.bootstrap']);
	
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
				if (this.events.indexOf(eventName) >= 0) return;
				// this is the bastard causing multiple modals to spawn
				// probably other issues too
				socket.on(eventName, function(){  
					var args = arguments;
					$rootScope.$apply(function(){
						if (callback) callback.apply(socket, args);
					});
				});
				this.events.push(eventName);
			},
			emit: function(eventName, data, callback){	
				socket.emit(eventName, data, function(){
					var args = arguments;
					$rootScope.$apply(function(){
						if (callback) callback.apply(socket, args);
					});
				});
			}
		};
		return handler;
		
	}).run(function($rootScope, $location){
		$rootScope.$on('$routeChangeSuccess', function(event, current, previous){
			$rootScope.pagetitle = current.$$route.title;
		});
		$rootScope.location = $location;
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
	
	app.config(function($routeProvider, $locationProvider, $httpProvider){
		
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
		
		$routeProvider.when('/login', {
			title: 'Login',
			templateUrl: '/views/partials/login.html',
			controller: 'loginCtrl'
			
		}).when('/dashboard', {
			title: 'Dashboard',
			templateUrl: '/views/partials/dashboard.html',
			controller: 'homeCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/downloads', {
			title: 'Downloads',
			templateUrl: '/views/partials/downloads.html',
			controller: 'downloadsCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/movies', {
			title: 'Movies',
			templateUrl: '/views/partials/movies.html',
			controller: 'moviesCtrl',
			reloadOnSearch: false,
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/shows', {
			title: 'Shows',
			templateUrl: '/views/partials/shows.html',
			controller: 'showsCtrl',
			reloadOnSearch: false,
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/shows/match', {
			title: 'Unmatched shows',
			templateUrl: '/views/partials/match.html',
			controller: 'matchCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
		}).when('/shows/unwatched', {
			title: 'Unwatched shows',
			templateUrl: '/views/partials/unwatched.html',
			controller: 'unwatchedCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/settings', {
			title: 'Settings',
			templateUrl: '/views/partials/settings.html',
			controller: 'settingsCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/install', {
			title: 'Installer',
			templateUrl: '/views/partials/install.html',
			controller: 'installCtrl',
			
		}).otherwise({
			resolve: {
				installed: checkInstalled
			},
			redirectTo: '/dashboard'
		});
	});
		
	return app;
});