requirejs.config({
	paths: {
		'bbq': '/assets/js/lib/jquery.bbq.min',
		'handlebars': 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	},
	shim: {
		'handlebars': {
			exports: 'Handlebars'
		},
		'jquery': {
			exports: '$'
		},
		'socket.io': {
			exports: 'io'
		}
	}
});

function zeroPad(num, length) {
	var pad = '000000';
	if (typeof(length) == 'undefined') length = 2;
	return (pad + num).slice(-length);
}

require(['socket.io', 'jquery', 'handlebars'], function(io, $, Handlebars){
	var port = (window.location.port) ? window.location.port : 80;
	
	var socket = io.connect('http://' + window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
	});
	
	require(['bbq'], function(){
		jQuery(window).bind('hashchange', function(e){
			var url = $.param.fragment();
			if (url == '') url = 'shows/dashboard';
			socket.emit(url.replace('/','.'))
		}).trigger('hashchange');
	});
	
	
	socket.on('page.template', function(data){
		var tmpl = Handlebars.compile(data.template);
		$('#main').html(tmpl(data.repsonse));
	});
	
	
	
	socket.on('show.info', function(data){
		
	});
	
	socket.on('shows.list', function(data){
		$('#main').html('');
		$.get('views/show/list.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			$('#main').html(tmpl(data));
		});
	});
	
	socket.on('show.episodes', function(data){
		$.get('views/show/episodes.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			var html = tmpl(data);
			
			var show = $('li#show-'+data.id);
			$('ul.seasons', show).replaceWith(html);
			$('ul.seasons', show).slideDown();
		});
	});
	
	socket.on('shows.unmatched', function(data){
		
		console.log(data);
		
		$.get('views/show/unmatched.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			var html = tmpl(data);
			
			$('#main').html(html);
		});
	});
	
	socket.on('main.settings', function(data){
		$.get('views/main/settings.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			var html = tmpl(data);
			$('#main').html(html);
		});
	});
	
//	socket.emit('main.settings');
	
	$(document).on('submit', 'form', function(e){
		e.preventDefault();
		var action	= $(this).attr('action').replace('/', '.');
		var data	= $(this).serialize();
		
		socket.emit(action, data);
	});
	
	
	$(document).on('click', 'ul.shows > li > a', function(e){
		e.preventDefault();
		var seasons = $(this).siblings('ul.seasons');
		if (!$('li', seasons).length) {
			socket.emit('show.episodes', $(this).data('id'));
		} else {
			$(seasons).slideToggle();
		}
	}).on('click', 'ul.shows a.season', function(e){
		e.preventDefault();
		$(this).siblings('ul.episodes').slideToggle();
		
	}).on('click', 'ul.shows div.settings', function(e){
		e.preventDefault();
		var data = $(this).siblings('a.show').data();
		
		// Fetch show information
		socket.emit('show.info', {
			id: data.id
		});
	});
});

