"use strict";

require(['app','jquery','socket.io','bootstrap'], function(nessa,$,io){
	
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
	
	nessa.controller('loginCtrl', function($scope, $rootScope, $http, $location, $window){
		$scope.user = {};
		
		$scope.login = function(){
			$http.post('/login', {
				username: $scope.user.username,
				password: $scope.user.password,
			}).success(function(user){
				$window.history.back();
			}).error(function(){
				// alert
				$location.url('/login');
			});
		};
	});
	
	nessa.controller('navCtrl', function($scope, $location){
		
		$scope.menu = [{
			path: 'dashboard',
			name: 'Dashboard'
		},{
			path: 'shows',
			name: 'Shows'
		},{
			path: 'downloads',
			name: 'Downloads'
		},{
			path: 'settings',
			name: 'Settings'
		}];
		
		$scope.isActive = function(viewLocation){
			return viewLocation === $location.path();
		};
	});
	
	// Section-specific controllers

	nessa.controller('downloadCtrl', function($scope, socket){
		$scope.downloads = [];
		$scope.predicate = 'name';
		$scope.reverse = false;
		
		socket.emit('download.list');
		setInterval(function(){
			socket.emit('download.list');
		}, 5000);
		
		socket.on('download.list', function(data){
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
	
	nessa.controller('homeCtrl', function($scope, socket){
		$scope.unmatched = 0;
		$scope.upcoming = [];
		
		socket.emit('dashboard');
		socket.on('dashboard.latest', function(data){
			$scope.latest = data;
		});
		socket.on('dashboard.stats', function(data){
			$scope.stats = data;
		});
		socket.on('dashboard.unmatched', function(data){
			$scope.unmatched = data.count;
		});
		socket.on('dashboard.upcoming', function(data){
			$scope.upcoming = data;
		});
		
	});
	
	nessa.controller('matchCtrl', function($scope, socket){
		$scope.unmatched	= [];
		socket.emit('shows.unmatched');
		socket.on('shows.unmatched', function(data){
			$scope.unmatched.push(data);
		});
		
		$scope.save = function(){
			var matched = [];
			$('input[type=radio]:checked').each(function(){
				var record = {
					id: $(this).data('id'),
					tvdb: $(this).val()
				}
				matched.push(record);
			});
			socket.emit('shows.matched', matched);
		};
		
	});

	nessa.controller('settingsCtrl', function($scope, socket){
		$scope.settings = {}
		$scope.branches = [{name: 'master'},{name: 'nightly'}];
		$scope.users = [];
			
		socket.emit('system.settings');
		socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		
		socket.emit('system.users');
		socket.on('system.users', function(data){
			$scope.users = data;
		});
		
		$scope.save = function(form){
			socket.emit('system.settings', $scope.settings)
		};
		
		$scope.latest = function(){
		//	if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				socket.emit('system.latest');
		//	}
		};
		$scope.listings = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				socket.emit('system.listings');
			}
		};
		$scope.rescan = function(){
			if (confirm('WARNING: NodeTV will probably become VERY laggy during a full rescan. Continue anyway?')) {
				socket.emit('system.rescan');
			}
		};
		$scope.reboot = function(){
			if (confirm('This will restart NodeTV. Are you sure?')) {
				socket.emit('system.restart');
			}
		};
		$scope.update = function(){
			if (confirm('This will force NodeTV to update to the latest version. Are you sure?')) {
				socket.emit('system.update');
			}
		};
	});
	
	nessa.controller('showCtrl', function($scope, $routeParams, $filter, socket){
		$scope.detail	= {};
		$scope.shows	= [];
		
		$scope.predicate = 'name';
		$scope.reverse	= false;
		
		$scope.query	= null;
		$scope.results	= [];
		$scope.selected = false;
		
		socket.emit('shows.list');
		
		socket.on('shows.list', function(data){
			$scope.shows = data;
			setTimeout(function(){
				$(document).trigger('lazyload');
			}, 250);
		});
		
		// Search
		socket.on('shows.search', function(data){
			$scope.results = data;
		});
		
		socket.on('show.added', function(){
			socket.emit('shows.enabled');
		});
		
		$scope.showAdd = function(){
			socket.emit('show.add', $scope.selected);
			$scope.selected = false;
			
			$('#add-modal').modal('close');
		};
		
		$scope.modalAdd = function(){
			$scope.query = null;
			$scope.results = [];
			$scope.selected = false;
			
			if (!$('.modal-open').length) {
				$('#add-modal').modal();
			}
		};
		
		$scope.modalDetail = function(id){
			socket.emit('show.summary', id);
			socket.on('show.summary', function(json){
				$scope.detail = json;
				setTimeout(function(){
					if (!$('.modal-open').length) {
						$('#show-modal').modal();
					}
				}, 100);
			});
		};
		
		var delaySearch = null;
		$scope.search = function(){
			clearTimeout(delaySearch);
			
			$scope.results = [];
			if ($scope.query.length >= 3) {
				delaySearch = setTimeout(function(){
					socket.emit('shows.search', $scope.query);
				}, 500);
			}
		};	
		$scope.rescan = function(id){
			// trigger show-specific rescan
		};
		$scope.save = function(){
			socket.emit('show.settings', $scope.detail.summary);
		};
		$scope.remove = function(id){
			if (confirm('Are you sure you want to remove this show?')) {
				socket.emit('show.remove', id);
				$('#show-modal').modal('close')
			}
		};
		$scope.update = function(id){
			socket.emit('show.update', {id: id}, function(){
				socket.emit('show.overview', id);
			});
		};
	});
	
	// Bootstrap to document
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
	
	
	$(document).on('click', '.episode .title', function(){
		var parent = $(this).parent();
		$('.episode.open').not(parent).toggleClass('open').children('.extended').slideToggle();
		$(parent).toggleClass('open').children('.extended').slideToggle();
	});
	
	
	$(document).on('click', 'watched', function(){
		// mark episodes as watched/unwatched
		
	});
	
	
});