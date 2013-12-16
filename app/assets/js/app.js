"use strict";

define('app', ['angular','socket.io','ngCookies','ngResource','ngRoute'], function(angular,io){

	var app = angular.module('nessa', ['ngCookies','ngResource','ngRoute']);
	
	app.factory('socket', function($rootScope) {
		var port = (window.location.port) ? window.location.port : 80;
		var socket = io.connect('http://' + window.location.hostname + ':' + port, {
			'connect timeout': 2000,
			'max reconnection attempts': 5,
			'sync disconnect on unload': true
		});
		return {
			on: function(eventName, callback){
				socket.on(eventName, function(){  
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
			}
		};
	});
	
	app.filter('downloadName', function(){
		return function(string){
			return string.replace(/\./g, ' ');
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
			templateUrl: 'views/partials/login.html',
			controller: 'loginCtrl'
			
		}).when('/dashboard', {
			templateUrl: 'views/partials/dashboard.html',
			controller: 'homeCtrl'
			
		}).when('/downloads', {
			templateUrl: 'views/partials/downloads.html',
			controller: 'downloadCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/shows', {
			templateUrl: 'views/partials/shows.html',
			controller: 'showCtrl'

		}).when('/shows/:id', {
			templateUrl: 'views/partials/shows.html',
			controller: 'showCtrl'
			
		}).when('/match', {
			templateUrl: 'views/partials/match.html',
			controller: 'matchCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/settings', {
			templateUrl: 'views/partials/settings.html',
			controller: 'settingsCtrl',
			resolve: {
				loggedin: checkLoggedin
			}
			
		}).when('/install', {
			templateUrl: 'views/partials/install.html',
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