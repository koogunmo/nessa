'use strict';

require(['jquery','socket.io','app'], function($,io,nessa){
	
	nessa.controller('headCtrl', function($scope, $state){
	});
	
	nessa.controller('alertsCtrl', function($scope, $socket){
		$scope.alerts = [];
		
		$socket.on('system.alert', function(alert){
			if (!alert.title) alert.title = 'NodeTV';
			if (!alert.icon) {
				switch (alert.type){
					case 'danger':
					case 'info':
					case 'success':
					case 'warning':
					default:
						alert.icon = '/assets/gfx/icons/touch-icon.png';
				}
			}
			if (('Notification' in window) && Notification.permission === 'granted'){
				var notification = new Notification(alert.title, {body: alert.message, icon: alert.icon});
				notification.onclick = function(e){
					if (notification.url) document.location = window.url;
					notification.close();
				}
				if (alert.autoClose){
					setTimeout(function(){
						notification.close();
					}, alert.autoClose);
				}
			} else {
				$scope.alerts.push(alert);
				if (alert.autoClose) {
					setTimeout(function(){
						$scope.closeAlert($scope.alerts.length-1);
						$scope.$apply();
					}, alert.autoClose);
				}
			}
		});
		
		$scope.closeAlert = function(index){
			$scope.alerts.splice(index, 1);
		};
		
		$scope.$on('$stateChangeSuccess', function(){
			$scope.alerts = [];
		});
	});
	
	nessa.controller('navCtrl', function($location, $rootScope, $scope){
		$scope.menu = [{
			path: 'dashboard',
			name: 'Dashboard',
			icon: 'dashboard'
		},{
	//		path: 'movies',
	//		name: 'Movies'
	//	},{
			path: 'shows',
			name: 'Shows',
			icon: 'th'
		},{
			path: 'downloads',
			name: 'Downloads',
			icon: 'download'
		},{
			path: 'settings',
			name: 'Settings',
			icon: 'cog'
			
		}];
		
		$scope.isActive = function(viewLocation){
			return viewLocation === $location.path();
		};
		$scope.isCollapsed = true;
		
		$scope.collapse = function(){
			$scope.isCollapsed = true;
		};
		$scope.toggle = function(){
			$scope.isCollapsed = !$scope.isCollapsed;
		};
	});
	
	// Section-specific controllers
	nessa.controller('downloadsCtrl', function($scope, $socket, $modal){
		$scope.predicate = 'name';
		$scope.reverse = false;
		$socket.emit('download.list');
	});
		
	nessa.controller('downloadAddCtrl', function($modalInstance, $scope, $socket){
		window.modal = $modalInstance;
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.save = function(){
			$socket.emit('download.url', $scope.url);
			$modalInstance.close();
		};
	});

	nessa.controller('downloadCtrl', function($http, $modalInstance, $scope, $socket, $state, $stateParams){
		$scope.torrent = {};
		// fetch info
		
		$socket.emit('download.info', $stateParams.id);
		$socket.on('download.info', function(data){
			if (data.id != $stateParams.id) return;
			$scope.torrent = data;
		});
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this torrent?')) {
				/*
				$http.delete('/api/downloads/'+$scope.torrent.id).success(function(json, status){
					$modalInstance.dismiss('close');
				}).error(function(json, status){
					console.error(json,status);
				});
				*/
				$socket.emit('download.remove', {id: $scope.torrent.id, purge: true});
			}
		};
		$scope.toggle = function(){
			$scope.torrent.status = !$scope.torrent.status;
			if ($scope.torrent.status){
				$socket.emit('download.start', $scope.torrent.id);
			} else {
				$socket.emit('download.stop', $scope.torrent.id);
			}
		};
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.save = function(){
			$modalInstance.close();
		};
	});
	
	nessa.controller('homeCtrl', function($http, $scope, $socket){
		
		$scope.unmatched = 0;
		$scope.upcoming = [];
		$scope.latest = [];
		$scope.notifications = false;
		
		if (('Notification' in window) && Notification.permission === 'granted'){
			$scope.notifications = true;
		}
		
		$http.get('/api/system/status').success(function(json,status){
			$scope.stats = json;
			$scope.uptime = {
				days: Math.floor($scope.stats.uptime / 86400),
				hour: Math.floor(($scope.stats.uptime % 86400) / 3600),
				mins: Math.floor((($scope.stats.uptime % 86400) % 3600) / 60),
				secs: (($scope.stats.uptime % 86400) % 3600) % 60
			};			
		});
		
		
		$socket.emit('dashboard');
		$socket.on('dashboard.latest', function(data){
			$scope.latest.push(data);
		});
		$socket.on('dashboard.unmatched', function(data){
			$scope.unmatched = data.count;
		});
		$socket.on('dashboard.upcoming', function(data){
			$scope.upcoming = data;
		});
				
		$scope.enableAlerts = function(){
			if (('Notification' in window)){
				if (Notification.permission === 'granted'){
					return;
				} else if (Notification.permission !== 'denied') {
					Notification.requestPermission(function(permission){
						if (!('permission' in Notification)) {
							Notification.permission = permission;
						}
						if (permission === 'granted') {
							var notification = new Notification('NodeTV', {body: 'Desktop alerts enabled', icon: '/assets/gfx/icons/touch-icon.png'});
							setTimeout(function(){
								notification.close()
							}, 1500);
							$scope.notifications = true;
						}
					});
				}
			}
		}
	});
	
	nessa.controller('matchCtrl', function($modalInstance, $scope, $socket, $state){
		$scope.unmatched	= [];
		$scope.matched		= [];
		
		$socket.emit('shows.unmatched');
		
		$socket.on('shows.unmatched', function(data){
			$scope.unmatched.push(data);
		});
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.set = function(id, tvdb){
			$scope.matched[id] = {id: id, tvdb: tvdb};
		};
		$scope.save = function(){
			$socket.emit('shows.matched', $scope.matched);
			$scope.close();
		};
	});
	
	nessa.controller('userCtrl', function($modalInstance, $scope, $socket, $state, $stateParams){
		window.modal = $modalInstance;
		$scope.user = {};
		if ($stateParams.id) {
			var id = $stateParams.id;
			$socket.emit('system.user', id);
			$socket.on('system.user', function(json){
				delete json.password
				$scope.user = json;
			});
		}
		$scope.remove = function(){
			if (confirm('Are you sure?')){
				$socket.emit('system.user.remove', $scope.user._id);
				$modalInstance.close();
			}
		};
		$scope.save = function(){
			$socket.emit('system.user.update', $scope.user);
			$modalInstance.close();
		};
		$scope.close = function(){
			$modalInstance.dismiss();
		};
	});	
	
	nessa.controller('unwatchedCtrl', function($scope, $socket){
		$socket.emit('shows.unwatched');
		
	});
	
	/*
	nessa.controller('moviesCtrl', function($http, $modal, $scope, $socket){
		$scope.movies = [];
		$scope.settings = {};
		
		$socket.on('media.settings', function(data){
			$scope.settings = data;
		});
		$socket.on('movies.list', function(results){
			$scope.movies = results;
			$(document).trigger('lazyload');
		});
		
		
		$socket.emit('media.settings');
		$socket.emit('movies.list');
	});
	*/
	
	nessa.controller('searchCtrl', function($http, $modalInstance, $scope, $socket){
		$scope.selected = null;
		$scope.search = {
			query: ''
		};
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.reset = function(){
			$scope.selected = null;
			$scope.search.query = '';
		};
		$scope.select = function(tvdb) {
			$scope.selected = tvdb;
		};
		$scope.save = function(){
			$http.post('/api/shows', {tvdb: $scope.selected}).success(function(json, status){
				$modalInstance.close();
				
			}).error(function(json, status){
				console.error(json, status);
			});
		};
		
		var delaySearch = null;
		$scope.$watch('search.query', function(){
			clearTimeout(delaySearch);
			$scope.results = [];
			if ($scope.search.query.length >= 4) {
				delaySearch = setTimeout(function(){
					$http.post('/api/shows/search', {q: $scope.search.query}).success(function(results, status){
						$scope.results = results;
						
					}).error(function(json, status){
						console.error(json, status);
					});
				}, 600);
			}
		});
	});
	
	nessa.controller('seasonCtrl', function($scope, $socket){
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
			$socket.emit('show.season.watched', data);
		};
	});
	
	nessa.controller('episodeCtrl', function($scope, $socket){
		$scope.episode = $scope.$parent.episode;
		$scope.collapsed = true;
		
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var data = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode,
				watched: $scope.episode.watched
			};
			$socket.emit('show.episode.watched', data);
		};
		
		$scope.download = function(){
			var payload = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode
			};
			$socket.emit('show.episode.download', payload);
		};
		
		$scope.canDownload = function(){
			if ($scope.episode.hash && $scope.episode.status === undefined) {
				return true;
			}
			return false;
		};
		
		$scope.hasAired = function(){
			return (!!$scope.episode.file || $scope.episode.airdate && $scope.episode.airdate*1000 < new Date().getTime());
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
				$(this).addClass('lazy-loaded');
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