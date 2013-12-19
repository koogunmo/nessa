"use strict";

requirejs.config({
	paths: {
		'app': './app',
		'bootstrap': 'https://netdna.bootstrapcdn.com/bootstrap/3.0.3/js/bootstrap.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min',
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular-resource.min',
		'ngRoute': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular-route.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	},
	shim: {
		'angular': {
			deps: ['jquery'],
			exports: 'angular'
		},
		'bootstrap': {
			deps: ['jquery']
		},
		'ngCookies': {
			deps: ['angular']
		},
		'ngResource': {
			deps: ['angular']
		},
		'ngRoute': {
			deps: ['angular']
		},
		'socket.io': {
			exports: 'io'
		}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});