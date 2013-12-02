"use strict";

require(['jquery','socket.io','app'], function($,io,nessa){
	
	$('#loading').hide();
	
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
	
	nessa.controller('mainController', function($scope, socket) {
		socket.emit('main.dashboard');
		socket.on('main.dashboard', function(data){
			$scope.latest = data;
		});
	});
	
	nessa.controller('showController', function($scope, $routeParams, socket) {
		socket.emit('shows.enabled');
		socket.on('shows.enabled', function(data){
			$scope.shows = data;
			setTimeout(function(){
				$(document).trigger('lazyload');
			}, 500);
		});
		
		$scope.modalShow = function(id){
			console.log(id);
			//fetch data, open modal?
		};
	});

	nessa.controller('settingsController', function($scope, socket) {
		socket.emit('main.settings');
		socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		$scope.reboot = function(){
			// Reboot nodeTV
			socket.emit('system.reboot');
		}
		$scope.update = function(){
			// Update NodeTV
			socket.emit('system.update');
		}
	});
	
	
	// Routing 
	nessa.config(['$routeProvider', function($routeProvider){
		$routeProvider.when('/dashboard', {
			templateUrl: 'views/partials/dashboard.html'
			
		}).when('/shows', {
			templateUrl: 'views/partials/shows.html',
			controller: 'showController'
			
		}).when('/settings', {
			templateUrl: 'views/partials/settings.html',
			controller: 'settingsController'
			
		}).otherwise({
			redirectTo: '/dashboard'
		})
	}]);
	
	// Bootstrap
	angular.bootstrap(document, ['nessa'])
});