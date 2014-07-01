'use strict';
requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.14/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min',
		'moment': 'libs/moment.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.14/angular-resource.min',
		'ngStorage': 'libs/ng-storage.min',
		'ngTouch': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-beta.14/angular-touch.min',
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
		'ngResource':	{deps: ['angular']},
		'ngStorage':	{deps: ['angular']},
		'ngTouch':		{deps: ['angular']},
		'ui.bootstrap': {deps: ['angular']},
		'ui.router':	{deps: ['angular']}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});