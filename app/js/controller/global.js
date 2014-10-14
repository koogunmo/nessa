define(['app'], function(nessa){
	
	nessa.controller('headCtrl', function($scope, $state){
		
	});
	
	nessa.controller('alertsCtrl', function($scope){
		$scope.alerts = [];
		
		$scope.$on('alert', function(e,alert){
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
			var timeout = 3000;
			
			if (('Notification' in window) && Notification.permission === 'granted'){
				// Use Notification API
				var notification = new Notification(alert.title, {body: alert.message, icon: alert.icon});
				notification.onclick = function(e){
					if (notification.url) document.location = window.url;
					notification.close();
				}
			//	if (alert.autoClose){
					setTimeout(function(){
						notification.close();
					}, timeout);
			//	}
			} else {
				// Use custom alerts system
				
				$scope.alerts.push(alert);
			//	if (alert.autoClose) {
					setTimeout(function(){
						$scope.closeAlert($scope.alerts.length-1);
						$scope.$apply();
					}, timeout);
			//	}
			}
		});
		
		$scope.closeAlert = function(index){
			$scope.alerts.splice(index, 1);
		};
		
		$scope.$on('$stateChangeSuccess', function(){
			$scope.alerts = [];
		});
	});
	
	nessa.controller('navCtrl', function($location, $log, $rootScope, $scope, $state){
		$scope.menu = $rootScope.menu;
		$scope.state = $state;
		$scope.authenticated = false;
		
		$scope.isCollapsed = true;
		$scope.isActive = function(viewLocation){
			return viewLocation === $location.path();
		};
		$scope.collapse = function(){
			$scope.isCollapsed = true;
		};
		$scope.toggle = function(){
			$scope.isCollapsed = !$scope.isCollapsed;
		};
		
		$scope.$on('authenticated', function(e,status){
			$scope.authenticated = !!status;
		});
	});
	
	nessa.run(function($log){
		$log.info('Module loaded: Notifications');
	});
	
	return nessa;
});