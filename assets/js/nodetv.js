requirejs.config({
	paths: {
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min',
		'ng': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular.min',
		'ngCookies': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-cookies.min',
		'ngResource': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-resource.min',
		'ngRoute': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.3/angular-route.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	},
	shim: {
		'ng': {
			exports: 'angular'
		},
		'ngCookies': {
			depends: ['ng']
		},
		'ngResource': {
			depends: ['ng']
		},
		'ngRoute': {
			depends: ['ng']
		},
		'socket.io': {
			exports: 'io'
		}
	}
});

require(['jquery','socket.io','ng','ngRoute','ngResource'], function($,io,angular){
	
	
	
	
	
	$('#loading').hide();
});