"use strict";

define('app', ['angular','socket.io','ngCookies','ngResource','ngRoute'], function(angular,io){
	var app = angular.module('nessa', ['ngCookies','ngResource','ngRoute']);
	app.factory('socket', function ($rootScope) {
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
	return app;
});