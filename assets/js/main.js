requirejs.config({
	paths: {
		'colorbox': '/assets/js/lib/jquery.colorbox.min',
		'handlebars': 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min',
	//	'jqueryui': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min',
		'socket.io': '/socket.io/socket.io'
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

require(['jquery', 'handlebars', 'socket.io'], function($, Handlebars, io){
	var port = (window.location.port) ? window.location.port : 80;
	
	var socket = io.connect('http://' + window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
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
	
	socket.emit('shows.enabled');
	
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
		
		// temporary
		console.log('Scan for episodes');
		socket.emit('show.scan', {
			id: $(this).data('id')
		}).on('show.scan', function(){
			socket.emit('show.episodes', $(this).data('id'));
		});
		
		// Open colorbox
		// show artwork, synopsis, etc
		
		/* Set:
			status: bool
			hd: bool
			directory: ?
			TVDB: int
			TVRage: int
		*/
	});
	
});

