"use strict";

requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular-resource.min',
		'ngRoute': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular-route.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min',
		'ui.bootstrap': 'libs/ui-bootstrap.min'
	},
	shim: {
		'angular': {
			deps: ['jquery'],
			exports: 'angular'
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
		},
		'ui.bootstrap': {
			deps: ['angular']
		}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});