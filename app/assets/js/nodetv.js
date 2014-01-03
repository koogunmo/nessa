"use strict";

require(['jquery','socket.io','app','bootstrap'], function($,io,nessa){
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
	
	nessa.controller('navCtrl', function($scope, $rootScope, $location){
		
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
		
		$scope.$on('$locationStartChange', function(a,b,c){
			console.log(a,b,c);
		});
		/*
		$rootScope.$on('$routeChangeStart', function(e, next, current){
			
			console.log(e, next, current);
			
		//	return false;
			
			e.preventDefault();
			
			
			
		//	
			
		//	$('.modal.in').modal('close');
		});
		*/
	});
	
	// Section-specific controllers
	
	nessa.controller('installCtrl', function($scope, socket){
		$scope.settings = {};
		socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		socket.emit('system.settings');
	});
	
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
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				socket.emit('system.latest');
			}
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
	
	nessa.controller('showsCtrl', function($scope, $modal, $location, socket){
		
		var modal	= false;
		var opened	= false;
		
		var routeChange = function(){
			if ($location.search().tvdb) {
				$scope.view($location.search().tvdb);
			} else {
				if (opened) modal.close('navigation');
			}
		};
		$scope.$on('$routeChangeSuccess', routeChange)
		$scope.$on('$routeUpdate', routeChange);
		
		$scope.shows	= [];
		
		$scope.add = function(){
			if (opened) return;
			opened = true;
			
			modal = $modal.open({
				templateUrl: '/views/modal/add.html',
				controller: 'searchCtrl',
				windowClass: 'modal-add'
			});
			modal.opened.then(function(){
				opened = true;
			});
			modal.result.then(function(){
				opened = false;
			});
		};
		
		$scope.view = function(tvdb){
			if (opened) return;
			opened = true;
			socket.emit('show.summary', tvdb);
		};
		
		/* Open modal window containing show information */
		socket.on('show.summary', function(json){
			modal = $modal.open({
				templateUrl: '/views/modal/show.html',
				controller: 'showCtrl',
				backdrop: 'static',
				keyboard: false,
				windowClass: 'modal-show',
				resolve: {
					summary: function(){
						return json.summary;
					},
					listing: function(){
						return json.listing;
					}
				}
			});
			modal.opened.then(function(){
				$location.search('tvdb', json.summary.tvdb);
				opened = true;
			});
			modal.result.then(function(result){
				$location.search('tvdb', null);
				opened = false;
			});
		});
		
		/* Retrieve shows list */
		socket.emit('shows.list');
		socket.on('shows.list', function(shows){
			$scope.shows = shows;
			$(document).trigger('lazyload');
		});
	});
	
	nessa.controller('searchCtrl', function($scope, $modalInstance, socket){
		/* fix this bastard */
		$scope.query = null;
		
		socket.on('shows.search', function(data){
			$scope.results = data;
		});
		
		socket.on('show.added', function(){
			socket.emit('shows.enabled');
		});
		
		$scope.close = function(){
			$modalInstance.close();
		};
		
		$scope.save = function(){
			socket.emit('show.add', $scope.selected);
			$modalInstance.close();
		};
		
	//	var delaySearch = null;
		$scope.$watch('query', function(){
			
			console.log('Search: ' + $scope.query);
			return;
			
			/*
			clearTimeout(delaySearch);
			$scope.results = [];
			if ($scope.query.length >= 4) {
				delaySearch = setTimeout(function(){
					socket.emit('shows.search', $scope.query);
				}, 500);
			}
			*/
		});
		
		$scope.reset = function(){
			$scope.query	= null;
			$scope.results	= [];
			$scope.selected = false;
		};
	});
	
	nessa.controller('showCtrl', function($scope, $modalInstance, socket, summary, listing){
		$scope.summary = summary;
		$scope.listing = listing;
		
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.rescan = function(){
			socket.emit('show.rescan', $scope.summary.tvdb);
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				socket.emit('show.remove', $scope.summary.tvdb);
				$modalInstance.close();
			}
		};
		$scope.save = function(){
			socket.emit('show.settings', $scope.summary);
			$modalInstance.close();
		};
		$scope.update = function(){
			socket.emit('show.update', $scope.summary.tvdb);
		};
		$scope.watched = function(){
		//	socket.emit('show.watched', {tvdb: $scope.summary.tvdb});
		};
	});
	
	nessa.controller('seasonCtrl', function($scope, socket){
		$scope.seen = true;
		
		angular.forEach($scope.$parent.season.episodes, function(v,k){
			if (!v.watched) $scope.seen = false;
		});
		
		$scope.display = function(){
			if ($scope.season.season == 0) {
				return 'Specials';
			} else {
				return 'Season '+$scope.season.season;
			}
		};
		
		$scope.watched = function(){
			$scope.seen = true;
			var data = {
				tvdb: $scope.$parent.season.episodes[0].tvdb,
				season: $scope.$parent.season.season 
			};
			socket.emit('show.season.watched', data);
		};
	});
	
	nessa.controller('episodeCtrl', function($scope, socket){
		$scope.episode = $scope.$parent.episode;
		
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var data = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode,
				watched: $scope.episode.watched
			};
			socket.emit('show.episode.watched', data);
		};
		
		$scope.download = function(){
			var payload = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode
			};
			socket.emit('show.episode.download', payload);
		};
		
		$scope.canDownload = function(){
			if ($scope.episode.hash && $scope.episode.status === undefined) {
				return true;
			}
			return false;
		};
		
		$scope.hasAired = function(){
			return ($scope.episode.airdate*1000 < new Date().getTime());
		};
	});
	
	// Bootstrap to document
	angular.bootstrap(document, ['nessa'])
	
	
	// jQuery below
	
	$(window).on('orientationchange resize scroll', function(){
		$(document).trigger('lazyload');
	});
	
	$(document).on('keyup', '#shows input.search', function(){
		$(document).trigger('lazyload');
	});
	
	$(document).on('lazyload', function(){
		if ($(window).width() < 750) return;
		var height	= $(window).height();
		var top		= $(window).scrollTop();
		
		setTimeout(function(){
			$('div.image img[data-src]').one('load', function(){
				$(this).fadeIn();
			}).each(function(){
				if ($(this).attr('src')) return;
				var offset = $(this).parents('div.image').offset()
				if (offset.top < height+top) {
					$(this).attr({
						src: $(this).data('src')
					});
				}
			});
		}, 100);
	});
	
	$(document).on('click', '.episode .title', function(){
		var parent = $(this).parent();
		$('.episode.open').not(parent).toggleClass('open').children('.extended').slideToggle();
		$(parent).toggleClass('open').children('.extended').slideToggle();
	});
	
});