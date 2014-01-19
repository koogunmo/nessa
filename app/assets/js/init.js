"use strict";

requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.8/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.8/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.8/angular-resource.min',
		'ngRoute': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.8/angular-route.min',
		'socket.io': 'libs/socket.io.min',
		'ui.bootstrap': 'libs/ui-bootstrap.min',
		// For future use
		'firebase': 'https://cdn.firebase.com/v0/firebase',
		'angularfire': 'https://cdn.firebase.com/libs/angularfire/0.5.0/angularfire.min'
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
		},
		'firebase': {
			exports: 'firebase'
		},
		'angularfire': {
			deps: ['angular','firebase']
		}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});