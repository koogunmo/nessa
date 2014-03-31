'use strict';
requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.4/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min',
		'moment': 'libs/moment.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.4/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.4/angular-resource.min',
		'ngTouch': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.4/angular-touch.min',
		'socket.io': 'libs/socket.io.min',
		'ui.bootstrap': 'libs/ui-bootstrap.min',
		'ui.router': 'libs/ui-router.min'
	},
	shim: {
		'angular': {
			deps: ['jquery'],
			exports: 'angular'
		},
		'socket.io':	{exports: 'io'},
		'ngCookies':	{deps: ['angular']},
		'ngResource':	{deps: ['angular']},
		'ngTouch':		{deps: ['angular']},
		'ui.bootstrap': {deps: ['angular']},
		'ui.router':	{deps: ['angular']}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});