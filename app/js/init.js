'use strict';

requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-rc.1/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min',
		'moment': 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.3/moment.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-rc.1/angular-resource.min',
		'ngStorage': 'libs/ng-storage.min',
		'ngTouch': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-rc.1/angular-touch.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min',
		'ui.bootstrap': 'libs/ui-bootstrap.min',
		'ui.router': 'libs/ui-router.min',
		
		'tv.auth': 'controller/auth',
		'tv.dashboard': 'controller/dashboard',
		'tv.downloads': 'controller/downloads',
		'tv.global': 'controller/global',
		'tv.movies': 'controller/movies',
		'tv.settings': 'controller/settings',
		'tv.shows': 'controller/shows'
	},
	shim: {
		'angular':		{deps: ['jquery'], exports: 'angular'},
		'ngResource':	{deps: ['angular']},
		'ngStorage':	{deps: ['angular']},
		'ngTouch':		{deps: ['angular']},
		'socket.io':	{exports: 'io'},
		'ui.bootstrap': {deps: ['angular']},
		'ui.router':	{deps: ['angular']}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});