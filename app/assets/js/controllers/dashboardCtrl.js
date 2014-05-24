define(function(){
	return function($http, $scope, $socket){
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
	}
});