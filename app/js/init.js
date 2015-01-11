'use strict';

requirejs.config({
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min',
		'moment': 'libs/moment.min',
		'ngAnimate': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-animate.min',
		'ngAria': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-aria.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-cookies.min',
		'ngMessages': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-messages.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-resource.min',
		'ngSanitize': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-sanitize.min',
		'ngSocketIO': 'libs/ngSocketIO.min',
		'ngStorage': 'libs/ng-storage.min',
		'ngTouch': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-touch.min',
		'ui.bootstrap': 'libs/ui-bootstrap-0.12.0.min',
		'ui.router': 'libs/ui-router-0.2.13.min',
		// Application files
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
		'ngAnimate':	{deps: ['angular']},
		'ngAria':		{deps: ['angular']},
		'ngCookies':	{deps: ['angular']},
		'ngMessages':	{deps: ['angular']},
		'ngResource':	{deps: ['angular']},
		'ngSanitize':	{deps: ['angular']},
		'ngSocketIO':	{deps: ['angular']},
		'ngStorage':	{deps: ['angular']},
		'ngTouch':		{deps: ['angular']},
		'ui.bootstrap': {deps: ['angular','ngAnimate']},
		'ui.router':	{deps: ['angular','ngAnimate']}
	},
	priority: ['jquery','angular'],
	deps: ['./nodetv']
});