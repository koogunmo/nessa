"use strict";

requirejs.config({
	paths: {
		'app': 'app',
		'bootstrap': './libs/bootstrap.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min',
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-resource.min',
		'ngRoute': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-route.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	},
	shim: {
		'angular': {
			exports: 'angular'
		},
		'bootstrap': {
			deps: ['jquery']
		},
		'ngCookies': {
			depends: ['angular']
		},
		'ngResource': {
			depends: ['angular']
		},
		'ngRoute': {
			depends: ['angular']
		},
		'socket.io': {
			exports: 'io'
		}
	},
	priority: ['angular'],
	deps: ['./nodetv']
});