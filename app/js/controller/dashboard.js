define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('dashboard', {
			url: '/dashboard',
			controller: 'dashboardCtrl',
			templateUrl: 'app/views/section/dashboard.html',
			data: {
				secure: true,
				title: 'Dashboard'
			}
		});
	});

	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Dashboard');
		$rootScope.menu.push({
			path: 'dashboard',
			name: 'Dashboard',
			icon: 'dashboard',
			order: 10
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('dashboardCtrl', function($http, $log, $scope){
		
		$scope.unmatched = 0;
		$scope.upcoming = [];
		$scope.latest = [];
		$scope.notifications = false;
		
		
		$scope.movies = [];
		$scope.shows = [];
		
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
		
		$http.get('/api/movies/latest').success(function(json,status){
			$scope.movies = json;
		})
		
		$http.get('/api/dashboard/latest').success(function(json,status){
			$scope.latest = json;
		});
		$http.get('/api/dashboard/upcoming').success(function(json,status){
			$scope.upcoming = json;
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
	
	nessa.controller('DashboardMovieCtrl', function($http,$log,$scope){
		
	})
	
	nessa.controller('upcomingCtrl', function($log, $scope){
		$scope.visible = false;
		
		$scope.day.episodes.forEach(function(episode){
			if (episode.episode.in_collection == false) $scope.visible = true;
			
			
		});
	});
	
	return nessa;
});