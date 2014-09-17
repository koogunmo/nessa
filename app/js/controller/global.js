define(['app'], function(nessa){
	
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
		$scope.menu = $rootScope.menu;
		
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
	});
	
	return nessa;
});