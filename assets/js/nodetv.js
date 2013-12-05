"use strict";

require(['jquery','socket.io','app','bootstrap'], function($,io,nessa){
	
	nessa.controller('navCtrl', function($scope, $location){
		$scope.isActive = function(viewLocation){
			return viewLocation === $location.path();
		};
	});
	
	nessa.controller('alertsCtrl', function($scope, socket){
		$scope.alerts = [];
		socket.on('system.alert', function(alert){
			$scope.alerts.push(alert);
			setTimeout(function(){
				$scope.closeAlert(0);
				$scope.$apply();
			}, 3500);
		});
		$scope.closeAlert = function(index){
			$scope.alerts.splice(index, 1);
		};
	});
	
	nessa.controller('loginCtrl', function($scope){
		$scope.username = null;
		$scope.password = null;
		
		$scope.login = function(){
			
		};
	});
	
	nessa.controller('homeCtrl', function($scope, socket){
		socket.emit('main.dashboard');
		socket.on('main.dashboard.latest', function(data){
			$scope.latest = data;
		});
		socket.on('main.dashboard.stats', function(data){
			$scope.stats = data;
		});
	});
	
	nessa.controller('showCtrl', function($scope, $routeParams, socket){
		socket.emit('shows.enabled');
		socket.on('shows.enabled', function(data){
			$scope.shows = data;
			setTimeout(function(){
				$(document).trigger('lazyload');
			}, 500);
		});
		
		$scope.detail = {};
		
		$scope.addShow = function(){
			// open modal to add shows
		};
		
		$scope.modalShow = function(id){
			socket.emit('show.overview', id);
			socket.on('show.overview', function(json){
				$scope.detail = json;
				if (!$('.modal-open').length) {
					$('#show-modal').modal();
				}
			});
		};
		
		
		$scope.rescan = function(id){
			// trigger show-specific rescan
		};
		
		$scope.save = function(){
			socket.emit('show.settings', $scope.detail.general);
		};
		
		$scope.update = function(id){
			socket.emit('show.update', {id: id}, function(){
				socket.emit('show.overview', id);
			});
		};
	});
	
	nessa.controller('downloadCtrl', function($scope, socket){
		$scope.downloads = [];
		$scope.sort = 'alpha';
		
		socket.emit('download.list');
		setInterval(function(){
			socket.emit('download.list');
		}, 2500);
		
		socket.on('download.list', function(data){
			if ($scope.sort == 'alpha') {
				data.sort(function(a,b){
					if (a.name < b.name) return -1;
					if (a.name > b.name) return 1;
					return 0;
				});
			} else if ($scope.sort == 'age'){
				
			}
			$scope.downloads = data;
		});
		
		$scope.pause = function(id){
			socket.emit('download.pause', {id: id});
		};
		$scope.resume = function(id){
			socket.emit('download.resume', {id: id});
		};
		$scope.remove = function(id){
			if (confirm('Are you sure you want to delete this torrent?')) {
				socket.emit('download.remove', {id: id, purge: true});
			}
		};
	});
	
	nessa.controller('settingsCtrl', function($scope, socket){
		$scope.settings = {};
		socket.emit('system.settings');
		socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		
		$scope.save = function(form){
			socket.emit('system.settings', $scope.settings)
		};
		$scope.rescan = function(){
			// Full media rescan - not advisable
			socket.emit('system.rescan');
		};
		$scope.reboot = function(){
			socket.emit('system.restart');
		};
		$scope.update = function(){
			socket.emit('system.update');
		};
	});
	
	
	// Routing 
	nessa.config(['$routeProvider', function($routeProvider){
		$routeProvider.when('/dashboard', {
			templateUrl: 'views/partials/dashboard.html',
			controller: 'homeCtrl'
			
		}).when('/downloads', {
			templateUrl: 'views/partials/downloads.html',
			controller: 'downloadCtrl'
			
		}).when('/shows', {
			templateUrl: 'views/partials/shows.html',
			controller: 'showCtrl'
			
		}).when('/settings', {
			templateUrl: 'views/partials/settings.html',
			controller: 'settingsCtrl'
			
		}).otherwise({
			redirectTo: '/dashboard'
		})
	}]);
	
	// Bootstrap
	angular.bootstrap(document, ['nessa'])
	
	
	// jQuery below
	
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