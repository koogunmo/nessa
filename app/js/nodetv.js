'use strict';

require(['app','tv.auth','tv.global','tv.dashboard','tv.shows','tv.movies','tv.downloads','tv.settings'], function(nessa){
	nessa.run(function($log){
		$log.info('NodeTV: Bootstrapping...');
	});
	angular.bootstrap(document, ['nessa']);	
	
	// jQuery below (must replace with directives at some point...)
	
	$(document).on('keyup', '#shows input.search', function(){
		$(document).trigger('lazyload');
	});
	
	$(document).on('click', '.episode .title', function(){
		var parent = $(this).parent();
		$('.episode.open').not(parent).toggleClass('open').children('.extended').slideToggle();
		$(parent).toggleClass('open').children('.extended').slideToggle();
	});
});