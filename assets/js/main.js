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
	
	var nessa = {
		init: function(){
			
		},
		modalClose: function(){
			$('#modal').fadeOut(function(){
				$('.content', this).html('');
			});
		},
		modalOpen: function(){
			$('#modal').fadeIn();
		}
	};
	
	
	/*
	$(document).on('resize', function(){
		// Reposition modal window
		var modal	= $('#modal');
		var height	= $('.wrapper', modal).height();
		var width	= $('.wrapper', modal).width();
		$('.wrapper', modal).css({
			'margin-left': 0-(width/2),
			'margin-top': 0-(height/2) || 0
		});
	}).trigger('resize');
	*/
	
	var port = (window.location.port) ? window.location.port : 80;
	
	var socket = io.connect('http://' + window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
	});
	
	
	require(['bbq'], function(){
		$(window).bind('hashchange', function(e){
			var url = $.param.fragment();
			if (url == '') url = 'main/dashboard';
			socket.emit(url.replace('/','.'))
		});
	});

	socket.on('connect', function(data){
		console.log('connect', data);
		$(window).trigger('hashchange');
		$('#loading').hide();
		
	}).on('disconnect', function(data){
		console.log('disconnect', data);
		$('#loading').show();
		
	}).on('reconnect', function(data) {
		console.log('reconnect', data);
		$('#loading').hide();
		
	});

	
	$(document).on('submit', 'form', function(e){
		/* Generic form handler */
		e.preventDefault();
		var action	= $(this).attr('action').replace('/', '.');
		var data	= $(this).serialize();
		socket.emit(action, data);
	});
	
	$(document).on('click', 'a.button', function(e){
		e.preventDefault()
		var action	= $(this).attr('href').replace('/', '.');
		
		if ($(this).hasClass('confirm')) {
			var msg = ($(this).data('msg')) ? $(this).data('msg') : 'Are you sure?';
			var confirmed = confirm(msg);
		} else {
			var confirmed = true;
		}
		if (confirmed) socket.emit(action, $(this).data());
	});
	
	
	/* Page */
	socket.on('page.template', function(response){
		$.get(response.template, function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			$('#main').html(tmpl(response.data));
			/*
			$('ul.shows > li[data-tvdb]').each(function(){
				var tvdb = $(this).data('tvdb');
				if (!tvdb) return;
				$(this).css({
					'background-image': 'url(assets/artwork/'+tvdb+'.jpg)'
				}).addClass('banner');
			});
			*/
		});
	}).on('page.reload', function(){
		window.location.reload();
	});
	
	socket.on('show.search', function(results){
		$.get('views/show/results.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			$('#modal .results').replaceWith(tmpl(results));
			$(document).trigger('resize');
		});
	});
	
	/***************************************************/
	
	$('#modal > .wrapper > .close').on('click', function(e){
		nessa.modalClose();
	});
	
	
	$(document).on('click', '.show-add', function(e){
		e.preventDefault()
		$.get('/views/show/search.html', function(html){
			$('#modal .content').html(html);
			$('#modal').fadeIn(function(){
				$('input:first-child', this).focus();
			});
		});
	});
	
	$(document).on('keydown', function(e){
		if (e.which == 27) nessa.modalClose();
	});
	
	
	
	$(document).on('keyup', 'input.search', function(e){
		if ($(this).val().length < 3) {
			$('#modal .results > li').remove();
			return;
		}
		socket.emit('show.search', $(this).val());
	});
	
	$(document).on('click', '.results a', function(e){
		e.preventDefault();
		
		socket.emit('show.add', $(this).data('id'));
		
		$('#modal').fadeOut(function(){
			$(this).html('');
		});
		
	});
	
	
	/* Settings page */
	$(document).on('click', '.settings h2', function(){
		if ($('fieldset.open').length && !$(this).next('fieldset').hasClass('open')) {
			$('fieldset.open').removeClass('open').slideUp();
		}
		$(this).next('fieldset').addClass('open').slideDown();
	});





	/***************************************************/
	
	
	socket.on('show.info', function(data){
		
	});
	
	socket.on('shows.list', function(data){
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
		$.get('views/show/unmatched.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			var html = tmpl(data);
			
			$('#main').html(html);
		});
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

