requirejs.config({
	shim: {
		'socket.io': {
			exports: 'io'
		},
		'jquery': {
			exports: '$'
		}
	},
	paths: {
		'angular': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min',
		'jqueryui': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	}
});

require(['angular', 'jquery','socket.io'], function(angular, $, io){
	var port = (window.location.port) ? window.location.port : 80;
	
	/*
	var socket = io.connect(window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
	});
	
	socket.on('hello', function(data){
		console.log(data);
	});
	*/
	
	
	$('ul.shows li > a').on('click', function(e){
		e.preventDefault();
		if ($(this).siblings('ul').length) {
			$(this).parent('li').toggleClass('open');
		}
	});
	
});