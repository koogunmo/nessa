define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider
			.state('dashboard', {
				url: '/dashboard',
				controller: 'DashboardController',
				templateUrl: 'views/dashboard/index.html',
				data: {
					secure: true,
					title: 'Dashboard'
				}
			})
			.state('dashboard.shows',{
				'url': '/shows',
				'controller': 'DashboardShowsController',
				'templateUrl': '/views/dashboard/partial/shows.html',
				'data':{'secure':true}
			})
			.state('dashboard.movies',{
				'url': '/movies',
				'controller': 'DashboardMoviesController',
				'templateUrl': '/views/dashboard/partial/movies.html',
				'data':{'secure':true}
			})
			.state('dashboard.queue',{
				'url': '/queue',
				'controller': 'DashboardQueueController',
				'templateUrl': '/views/dashboard/partial/queue.html',
				'data':{'secure':true}
			})
			.state('dashboard.system',{
				'url': '/system',
				'controller': 'DashboardSystemController',
				'templateUrl': '/views/dashboard/partial/system.html',
				'data':{'secure':true}
			})
	})

	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Dashboard');
		$rootScope.menu.push({
			'icon': 'dashboard',
			'name': 'Dashboard',
			'path': 'dashboard.shows',
			'root': 'dashboard',
			'sort': 10
		});
	})
	
	/****** Controller ******/
	
	nessa.controller('DashboardController', function($http,$interval,$log,$scope){
		$scope.notifications = false;
		if (('Notification' in window) && Notification.permission === 'granted'){
			$scope.notifications = true;
		}
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
							var notification = new Notification('NodeTV',{'body':'Desktop alerts enabled','icon':'/assets/gfx/icons/touch-icon.png'});
							setTimeout(function(){
								notification.close()
							}, 1500);
							$scope.notifications = true;
						}
					});
				}
			}
		};
	})
	.controller('DashboardShowsController', function($http,$log,$scope){
		$scope.episodes = [];
		$scope.unmatched = 0;
		$scope.upcoming = [];
		
		$http.get('/api/shows/latest').success(function(json,status){
			$scope.episodes = json;
		});
		$http.get('/api/dashboard/shows/unmatched').success(function(json,status){
			$scope.unmatched = json.count;
		});
		$http.get('/api/shows/upcoming').success(function(json,status){
			$scope.upcoming = json;
		});
	})
	.controller('DashboardEpisodeController', function($http,$log,$scope){
		$scope.collapsed = true;
		$scope.toggle = function(){
			$scope.collapsed = !$scope.collapsed;
		};
		$scope.checkin = function(){
			var payload = {
				'season': $scope.item.episode.season,
				'episode': $scope.item.episode.episode,
				'watched': $scope.item.episode.watched
			};
			$http.post('/api/shows/'+$scope.item.show.imdb+'/checkin', payload);
		};
		$scope.watched = function(){
			$scope.item.episode.watched = !$scope.item.episode.watched;
			var payload = {
				'season': $scope.item.episode.season,
				'episode': $scope.item.episode.episode,
				'watched': $scope.item.episode.watched
			};
			$http.post('/api/shows/'+$scope.item.show.imdb+'/watched', payload);
		}
	})
	.controller('DashboardMoviesController', function($http,$log,$scope){
		$scope.movies = [];
		$scope.unmatched = 0;
		$http.get('/api/movies/latest').success(function(json,status){
			$scope.movies = json;
		});
		$http.get('/api/dashboard/movies/unmatched').success(function(json,status){
			$scope.unmatched = json.count;
		});
	})
	.controller('DashboardMovieController', function($http,$log,$scope){
		$scope.download = function(object){
			$http.post('/api/movies/'+$scope.movie.imdb+'/download', object).success(function(success){
				$scope.movie.downloading = object.quality;
			})
		};
	})
	.controller('DashboardQueueController', function($http,$log,$scope){
		$scope.pending = [];
		$http.get('/api/movies/pending').success(function(json,status){
			$scope.pending = json;
		});
	})
	.controller('DashboardSystemController', function($http,$log,$scope){
		$scope.stats = {'uptime':0};
		$http.get('/api/system/status').success(function(json,status){
			$scope.stats = json;
			$interval(function(){
				$scope.stats.uptime++;
				$scope.uptime = {
					days: Math.floor($scope.stats.uptime / 86400),
					hour: Math.floor(($scope.stats.uptime % 86400) / 3600),
					mins: Math.floor((($scope.stats.uptime % 86400) % 3600) / 60),
					secs: (($scope.stats.uptime % 86400) % 3600) % 60
				};
			},1000)
		});
	})
	
	return nessa;
});