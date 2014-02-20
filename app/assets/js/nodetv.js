'use strict';

require(['jquery','socket.io','app'], function($,io,nessa){
	nessa.controller('alertsCtrl', function($scope, $socket){
		$scope.alerts = [];
		$socket.on('system.alert', function(alert){
			if (('Notification' in window)){
				if (Notification.permission === 'granted'){
					var notification = new Notification('NodeTV', {body: alert.message});
				} else if (Notification.permission !== 'denied') {
					Notification.requestPermission(function (permission) {
						if (!('permission' in Notification)) {
							Notification.permission = permission;
						}
						if (permission === 'granted') {
							var notification = new Notification('NodeTV', {body: alert.message});
						}
					});
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
		$scope.$on('$routeChangeSuccess', function(){
			$scope.alerts = [];
		})
	});
	
	nessa.controller('loginCtrl', function($scope, $socket, $rootScope, $http, $location, $window){
		$scope.user = {};
		
		$scope.login = function(){
			$http.post('/login', {
				username: $scope.user.username,
				password: $scope.user.password,
			}).success(function(user){
				$window.history.back();
			}).error(function(){
				$socket.emit('system.alert', {
					type: 'danger',
					message: 'Incorrect login details'
				});
				$location.url('/login');
			});
		};
	});
	
	nessa.controller('navCtrl', function($scope, $rootScope, $location){
		$scope.menu = [{
			path: 'dashboard',
			name: 'Dashboard'
		},{
	//		path: 'movies',
	//		name: 'Movies'
	//	},{
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
		$scope.isCollapsed = true;
		
		$scope.collapse = function(){
			$scope.isCollapsed = true;
		};
		$scope.toggle = function(){
			$scope.isCollapsed = !$scope.isCollapsed;
		};
	});
	
	// Section-specific controllers
	
	nessa.controller('installCtrl', function($scope, $socket){
		$scope.settings = {};
		$socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		$socket.emit('system.settings');
		
		$socket.on('window.reload', function(){
			window.location.reload();
		});
		
	});
	
	nessa.controller('downloadsCtrl', function($scope, $socket){
		$scope.downloads = [];
		$scope.predicate = 'name';
		$scope.reverse = false;
		
		$socket.emit('download.list');
		setInterval(function(){
			$socket.emit('download.list');
		}, 5000);
		$socket.on('download.list', function(data){
			$scope.downloads = data;
		});
		
		$scope.addUrl = function(){
			$socket.emit('download.url', $scope.search.name);
			$scope.search.name = '';
		};
	});
	
	nessa.controller('downloadCtrl', function($scope, $socket){
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this torrent?')) {
				$socket.emit('download.remove', {id: $scope.$parent.download.id, purge: true});
			}
		};
		$scope.toggle = function(){
			if (!!$scope.$parent.download.status){
				$socket.emit('download.stop', $scope.$parent.download.id);
			} else {
				$socket.emit('download.start', $scope.$parent.download.id);
			}
			$scope.$parent.download.status = !$scope.$parent.download.status;
		};
	});
	
	nessa.controller('homeCtrl', function($scope, $socket){
		$scope.unmatched = 0;
		$scope.upcoming = [];
		$scope.latest = [];
		
		$socket.emit('dashboard');
		$socket.on('dashboard.latest', function(data){
			$scope.latest.push(data);
		});
		$socket.on('dashboard.stats', function(data){
			$scope.stats = data;
			$scope.uptime = {
				days: Math.floor($scope.stats.uptime / 86400),
				hour: Math.floor(($scope.stats.uptime % 86400) / 3600),
				mins: Math.floor((($scope.stats.uptime % 86400) % 3600) / 60),
				secs: (($scope.stats.uptime % 86400) % 3600) % 60
			};
		});
		$socket.on('dashboard.unmatched', function(data){
			$scope.unmatched = data.count;
		});
		$socket.on('dashboard.upcoming', function(data){
			$scope.upcoming = data;
		});
		
	});
	
	nessa.controller('matchCtrl', function($scope, $socket){
		$scope.unmatched	= [];
		$socket.emit('shows.unmatched');
		$socket.on('shows.unmatched', function(data){
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
			$socket.emit('shows.matched', matched);
		};
		
	});
	
	nessa.controller('userCtrl', function($scope, $socket, $modalInstance, id){
		$scope.user = {};
		
		$socket.emit('system.user', id);
		$socket.on('system.user', function(json){
			delete json.password
			$scope.user = json;
		});
		$scope.save = function(){
			$socket.emit('system.user.update', $scope.user);
			$modalInstance.close();
		};
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
	});

	nessa.controller('settingsCtrl', function($scope, $socket, $modal){
		$scope.settings = {}
		$scope.branches = [{name: 'master'},{name: 'nightly'}];
		$scope.users = [];
		
		$scope.adduser = {};
			
		$socket.emit('system.settings');
		$socket.on('system.settings', function(data){
			$scope.settings = data;
		});
		
		$socket.emit('system.users');
		$socket.on('system.users', function(data){
			$scope.users = data;
		});
		
	//	$scope.addUser = function(){
	//		$socket.emit('system.user.update', $scope.adduser);
	//		$scope.adduser = {};
	//	};
		
		$scope.userEdit = function(id){
			// open modal
			$modal.open({
				templateUrl: '/views/modal/user.html',
				controller: 'userCtrl',
				resolve: {
					id: function(){
						return id;
					}
				}
			});
		};
		
		$scope.userRemove = function(id){
			$socket.emit('system.user.remove', id);
		};
		
		
		$scope.save = function(){
			$socket.emit('system.settings', $scope.settings)
		};
		
		$scope.latest = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$socket.emit('system.latest');
			}
		};
		$scope.listings = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$socket.emit('system.listings');
			}
		};
		$scope.rescan = function(){
			if (confirm('WARNING: NodeTV will probably become VERY laggy during a full rescan. Continue anyway?')) {
				$socket.emit('system.rescan');
			}
		};
		$scope.reboot = function(){
			if (confirm('This will restart NodeTV. Are you sure?')) {
				$socket.emit('system.restart');
			}
		};
		$scope.update = function(){
			if (confirm('This will force NodeTV to update to the latest version. Are you sure?')) {
				$socket.emit('system.update');
			}
		};
	});
	
	nessa.controller('unwatchedCtrl', function($scope, $socket){
		$socket.emit('shows.unwatched');
		
		
		
		
	});
	
	nessa.controller('moviesCtrl', function($scope, $modal, $socket){
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
	
	nessa.controller('showsCtrl', function($scope, $modal, $location, $socket){
		
		var modal	= false;
		var opened	= false;
		
		var routeChange = function(){
			if ($location.search().tvdb) {
				$scope.view($location.search().tvdb);
			} else {
				if (opened && modal) modal.close('navigation');
			}
		};
		$scope.$on('$routeChangeStart', routeChange)
		$scope.$on('$routeChangeSuccess', routeChange);
		$scope.$on('$routeUpdate', routeChange);
		
		$scope.shows	= [];
		$scope.settings	= {};
		
		$scope.add = function(){
			if (opened) return;
			opened = true;
			modal = $modal.open({
				templateUrl: '/views/modal/add.html',
				controller: 'searchCtrl',
				windowClass: 'modal-add',
				resolve: {
					search: function(){
						return ($scope.filter) ? $scope.filter.name : '';
					}
				}
			});
			modal.opened.then(function(){
				opened = true;
			});
			modal.result.then(function(){
				opened = false;
			});
		};
		$scope.clearFilter = function(){
			$scope.filter.name = '';
			$(document).trigger('lazyload');
		};
		
		$scope.view = function(tvdb){
		//	console.log(tvdb, opened);
			if (opened) return;
			opened = true;
			$socket.emit('show.summary', tvdb);
		};
		
		/* Open modal window containing show information */
		$socket.on('show.summary', function(json){
			modal = $modal.open({
				templateUrl: '/views/modal/show.html',
				controller: 'showCtrl',
				backdrop: 'static',
				keyboard: false,
				windowClass: 'modal-show',
				resolve: {
					settings: function(){
						return $scope.settings;
					},
					summary: function(){
						return json.summary;
					},
					listing: function(){
						return json.listing;
					},
					total: function(){
						return json.total;
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
		
		$socket.emit('media.settings');
		$socket.on('media.settings', function(data){
			$scope.settings = data;
		});
		
		$socket.on('show.added', function(){
			$socket.emit('shows.list');
		});
		$socket.on('shows.list', function(shows){
			$scope.shows = shows;
			$(document).trigger('lazyload');
		});
		
		/* Retrieve shows list */
		$socket.emit('shows.list');
	});
	
	nessa.controller('searchCtrl', function($scope, $modalInstance, $socket, search){
		$scope.selected = null;
		$scope.search = {
			query: search
		};
		$socket.emit('shows.search', $scope.search.query);
		
		$socket.on('shows.search', function(results){
			console.log(results);
			
			$scope.results = results;
		});
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.reset = function(){
			$scope.search.query = '';
		};
		$scope.select = function(tvdb) {
			$scope.selected = tvdb;
		};
		$scope.save = function(){
			$socket.emit('show.add', $scope.selected);
			$modalInstance.close();
		};
		
		var delaySearch = null;
		$scope.$watch('search.query', function(){
			clearTimeout(delaySearch);
			$scope.results = [];
			if ($scope.search.query.length >= 4) {
				delaySearch = setTimeout(function(){
					$socket.emit('shows.search', $scope.search.query);
				}, 500);
			}
		});
	});
	
	nessa.controller('showCtrl', function($scope, $modalInstance, $socket, settings, summary, listing, total){
		$scope.settings = settings;
		$scope.summary = summary;
		$scope.listing = listing;
		$scope.total = total;
		
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.rescan = function(){
			$socket.emit('show.rescan', $scope.summary.tvdb);
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				$socket.emit('show.remove', $scope.summary.tvdb);
				$modalInstance.close();
			}
		};
		$scope.save = function(){
			$socket.emit('show.settings', $scope.summary);
			$modalInstance.close();
		};
		$scope.update = function(){
			$socket.emit('show.update', $scope.summary.tvdb);
		};
		$scope.watched = function(){
		//	$socket.emit('show.watched', {tvdb: $scope.summary.tvdb});
		};
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
		$scope.collapsed = $scope.episode.watched;
		
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