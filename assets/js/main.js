requirejs.config({
	paths: {
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min',
		'jqueryui': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min',
		'socket.io': '/socket.io/socket.io',
	},
	shim: {
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

require(['jquery', 'socket.io'], function($, io){
	var port = (window.location.port) ? window.location.port : 80;
	
	var socket = io.connect('http://' + window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
	});
	
	socket.on('hello', function(data){
		console.log(data);
	});
	
	socket.on('shows.list', function(data){
		$('ul.shows > li').remove();
		$.each(data, function(k,row){
			var li = $('<li><a></a></li>').attr({id: 'show-'+row.id});
			$('a', li).text(row.name).addClass('show').attr({
				href: '#show/'+row.id
			}).data(row);
			
			$('ul.shows').append(li);
		});
	});
	
	socket.on('show.episodes', function(data){
		var seasons = $('<ul></ul>').addClass('seasons');
		$.each(data.list, function(s,eps){
			var season = $('<li><a href="#" class="season"></a><ul class="episodes"></ul></li>');
			$('a', season).text('Season ' + s);
			$.each(eps, function(i,ep){
				var li = $('<li><span class="episode"></span><span class="title"></span><span class="duration"></span><span class="date"></span></li>');
				$('.episode', li).text(zeroPad(ep.episode));
				$('.title', li).text(ep.title);
				$('.date', li).text(ep.airdate);
				$('ul.episodes', season).append(li);
				if (!ep.file) $(li).addClass('unavailable');
			});
			$(seasons).append(season);
		});
		$('#show-'+data.id).append(seasons).children('ul.seasons').slideToggle();
	});
	
	socket.emit('shows.enabled');
	
	$('ul.shows').on('click', 'li > a', function(e){
		e.preventDefault();
		var seasons = $(this).siblings('ul.seasons');
		if (!$(seasons).length) {
			socket.emit('show.episodes', $(this).data('id'));
		} else {
			$(seasons).slideToggle();
		}
	});
	
	$('ul.shows').on('click', 'a.season', function(e){
		e.preventDefault();
		$(this).siblings('ul.episodes').slideToggle();
	});
	
});

