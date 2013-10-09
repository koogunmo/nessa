requirejs.config({
	paths: {
		'bbq': '/assets/js/lib/jquery.bbq.min',
		'handlebars': 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.min',
		'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min',
		'socket.io': 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min'
	},
	shim: {
		'bbq': {
			deps: ['jquery']
		},
		'handlebars': {
			exports: 'Handlebars'
		},
		'jquery': {
			exports: '$'
		},
		'socket.io': {
			exports: 'io'
		},
	}
});

function zeroPad(num, length) {
	var pad = '000000';
	if (typeof(length) == 'undefined') length = 2;
	return (pad + num).slice(-length);
}

require(['socket.io', 'jquery', 'handlebars', 'bbq'], function(io, $, Handlebars){
	
	var nessa = {
		init: function(){
			
		},
		loadingClose: function(){
			$('#loading p').text('').parent().hide();
		},
		loadingOpen: function(message){
			var msg = 'Loading...';
			if (message) msg = message;
			$('#loading p').text(msg).parent().show();
		},
		modalClose: function(){
			$('#modal').fadeOut(function(){
				$('.content', this).html('');
			});
		},
		modalLoad: function(html){
			$('#modal .wrapper .content').html(html);
			this.toggle('#modal');
			this.modalOpen();
		},
		modalOpen: function(){
			$('#modal').fadeIn(function(){
				$(document).trigger('lazyload');
			});
		},
		toggle: function(context){
			$('input.toggle', context).each(function(){
				var input = $(this);
				var button = $('<span class="toggle"></span>').on('click', function(){
					switch ($(input).val()) {
						case '0':
							$(input).val('1');
							$(this).addClass('on');
							break;
						case '1':
							$(input).val('0');
							$(this).removeClass('on');
							break;
					}
				});
				if ($(input).val() == 1) $(button).addClass('on');
				$(this).after(button);
			});
		}
	};
		
	Handlebars.registerHelper('available', function(status){
		switch (status) {
			case 1:
				return 'downloading';
			case 2:
				return 'downloaded';
			default:
				return '';
		}
	});
	
	Handlebars.registerHelper('aired', function(airdate){
		// Check if the episode has aired
		var now = new Date().getTime()/1000;
		var date = airdate.split('-');
		var airs = new Date(date[0], date[1]-1, date[2], 0, 0, 0, 0).getTime()/1000;
		return (now >= airs) ? 'aired' : 'upcoming';
	});
	
	var port = (window.location.port) ? window.location.port : 80;
	
	var socket = io.connect('http://' + window.location.hostname + ':' + port, {
		'connect timeout': 2000,
		'max reconnection attempts': 5,
		'sync disconnect on unload': true
	});
	
	$(window).bind('hashchange', function(e){
		window.scrollTo(0,0);
		var url = $.param.fragment();
		if (url == '') url = 'main/dashboard';
		socket.emit(url.replace('/','.'))
	}).on('resize', function(){
		$(document).trigger('lazyload');
	});
	
	$(document).on('lazyload', function(){
		$('div.image:visible img[data-src]').each(function(){
			if ($(this).attr('src')) return;
			$(this).on('load', function(){
				$(this).fadeIn();
			}).attr({
				src: $(this).data('src')
			});
		});
	});
	
	socket.on('connect', function(data){
		$(window).trigger('hashchange');
		nessa.loadingClose();
	}).on('disconnect', function(data){
		nessa.loadingOpen('Reconnecting...');
	}).on('reconnect', function(data) {
		
	});
	
	socket.on('system.loading', function(data){
		nessa.loadingOpen(data.message);
	}).on('system.loaded', function(data){
		nessa.loadingClose();
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
		var action	= $(this).attr('href').replace(/\//g, '.');
		if ($(this).hasClass('confirm')) {
			var msg = ($(this).data('msg')) ? $(this).data('msg') : 'Are you sure?';
			var confirmed = confirm(msg);
		} else {
			var confirmed = true;
		}
		if (confirmed) socket.emit(action, $(this).data());
	});
	
	/* Page Content */
	socket.on('page.template', function(response){
		$.get(response.template, function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			$('#main').html(tmpl(response.data));
			nessa.toggle('#main');
			$(document).trigger('lazyload');
		});
		
	}).on('modal.template', function(response){
		$.get(response.template, function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			nessa.modalLoad(tmpl(response.data))
		});
	}).on('page.reload', function(){
		window.location.reload();
	});
	
	socket.on('show.search', function(results){
		var tmpl = $('#results-template').html();
		var tmpl = Handlebars.compile(tmpl);
		var output = tmpl(results);
		if ($('#modal #search .results').length) {
			$('#modal #search .results').replaceWith(output);
		} else {
			$('#modal #search').append(output)
		}
	});
	
	/***************************************************/
	/* Modal methods */
	
	$(document).on('keydown', function(e){
		if (e.which == 27) nessa.modalClose();
	});

	$('#modal').on('click', function(e){
		if (this == e.srcElement) nessa.modalClose();
	}).on('click', '.wrapper > .close', function(){
		nessa.modalClose();
	}).on('click', 'ul.seasons h2', function(){
		var parent = $(this).parent('li');
		if ($(parent).hasClass('open')) {
			$(parent).removeClass('open');
			$(this).siblings('ul.episodes').slideUp();
		} else {
			$('#modal ul.seasons > li.open > ul.episodes').slideUp().parent().removeClass('open');
			$(this).siblings('ul.episodes').slideDown().parent().addClass('open');
		}
	});
	
	/***************************************************/
	/* Open Search panel */
	
	$(document).on('click', '.show-add', function(e){
		e.preventDefault()
		
		$.get('/views/show/search.html', function(html){
			$('#modal .content').html(html);
			
			$('#modal').fadeIn(function(){
				$('input:first-child', this).focus();
			});
		});
	});
	
	
	
	
	
	/***************************************************/
	/* Search */
	
	$(document).on('keyup', 'input.search', function(e){
		if ($(this).val().length < 3) {
			$('#modal .results > li').remove();
			return;
		}
		socket.emit('show.search', $(this).val());
	});
	
	$(document).on('click', '.results > li', function(e){
		e.preventDefault();
		socket.emit('show.add', $(this).data('id'));
		nessa.modalClose();
	});
	
	
	/* Settings page */
	$(document).on('click', '.cog', function(e){
		e.preventDefault();
		if ($('#show.settings').length) {
			$('#show.settings').removeClass('settings');
		} else {
			$('#modal #show').addClass('settings');
		}
	});
	
	$(document).on('click', '#show ul.episodes .header > .title', function(){
		var parent = $(this).parents('.episode');
		if ($(parent).hasClass('open')) {
			$(parent).removeClass('open').children('.extended').slideUp();
		} else {
			$('ul.episodes .episode.open').removeClass('open').children('.extended').slideUp();
			$(parent).addClass('open').children('.extended').slideDown();
		}
	});
	
	/***************************************************/
	
	socket.on('shows.list', function(data){
		$.get('views/show/list.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			$('#main').html(tmpl(data));
		});
	});
	
	socket.on('shows.unmatched', function(data){
		$.get('views/show/unmatched.html', function(tmpl){
			var tmpl = Handlebars.compile(tmpl);
			var html = tmpl(data);
			
			$('#main').html(html);
		});
	});	
	
	$(document).on('click', '.synopsis', function(){
		$(this).toggleClass('open');
	});
	
	
	$(document).on('click', '#shows ul.shows > li', function(e){
		e.preventDefault();
		socket.emit('show.overview', $(this).data('id'));
	})
	
	
	
	$(document).on('click', '#settings h2', function(){
		var fieldset = $(this).next('fieldset');
		if ($(fieldset).hasClass('open')) {
			$(fieldset).removeClass('open').slideUp();
		} else {
			$('#settings fieldset.open').removeClass('open').slideUp();
			$(fieldset).addClass('open').slideDown();
		}
	});
	
	
	
	$('#modal').on('click', '.seen', function(e){
		e.preventDefault();
		e.stopPropagation();
		
		var data = $(this).data();
		var type = null;
		if (data.episode) {
			type = 'show.episode.watched';
		} else if (data.season) {
			type = 'show.season.watched';
		} else if (data.id) {
			type = 'show.watched';
		}
		if (type) socket.emit(type, data)
	});
	
});

