define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('dashboard', {
			abstract: true,
			controller: 'dashboardCtrl',
			templateUrl: 'app/views/partials/dashboard.html',
			data: {
				secure: true,
				title: 'Dashboard'
			}
		}).state('dashboard.default', {
			url: ''
		}).state('dashboard.index', {
			url: '/dashboard'
		});
	});

	nessa.run(function($rootScope){
		$rootScope.menu.push({
			path: 'dashboard.index',
			name: 'Dashboard',
			icon: 'dashboard',
			order: 10
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('dashboardCtrl', function($http, $scope, $socket){
		
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
		
		/* Replace with REST */
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
	
	return nessa;
});