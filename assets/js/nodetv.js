"use strict";

require(['jquery','socket.io','app','bootstrap'], function($,io,nessa){
	
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
		
		$scope.showData = {};
		
		$scope.modalShow = function(id){
			socket.emit('show.overview', id);
			socket.on('show.overview', function(json){
				$scope.apply(function(){
					$scope.showData = json;
				});
			});
		};
	});
	
	nessa.controller('alertsController', function($scope, socket) {
		socket.on('system.alert', function(data){
			// create an alert?
			console.log(data);
		});
	});
	
	nessa.controller('settingsController', function($scope, socket) {
		$scope.settings = {};
		socket.emit('system.settings');
		socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		
		$scope.save = function(form){
			socket.emit('system.settings', $scope.settings)
		};
		$scope.rescan = function(){
			socket.emit('system.rescan');
		};
		$scope.reboot = function(){
			socket.emit('system.reboot');
		};
		$scope.update = function(){
			socket.emit('system.update');
		};
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
	
	
	// jQuery below
	
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
	}).on('click', '#dashboard .latest', function(){
		$('.synopsis', this).slideToggle();
		
	});
	
	
});