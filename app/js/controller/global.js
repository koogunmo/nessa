define(['app'], function(nessa){
	
	nessa.controller('NavigationController', function($http,$localStorage,$location,$log,$modal,$scope,$state){
		$scope.$storage = $localStorage;
		
		$scope.isCollapsed = true;
		$scope.state = $state;
		$scope.visible = true;
		
		$scope.collapse = function(){
			$scope.isCollapsed = true;
		};
		$scope.profile = function(){
			$modal.open({
				'templateUrl': 'views/settings/modal/user.html',
				'controller': 'UserController'
			});
		};
		$scope.toggle = function(){
			$scope.isCollapsed = !$scope.isCollapsed;
		};
		
		$scope.$watch('$storage', function(){
			$scope.visible = !!$scope.$storage.session;
			$scope.user = $scope.$storage.user;
		},true);
	})
	.controller('AlertsController', function($log,$scope,$socket){
		$scope.alerts = [];
		
		var alertHandler = function(e,alert){
			var defaults = {
				'icon': '/assets/gfx/icons/touch-icon.png',
				'message': '',
				'timeout': 3000,
				'title': 'NodeTV',
				'type': 'info',
				'url': false
			};
			var alert = angular.extend({}, defaults, alert);
			if (('Notification' in window) && Notification.permission === 'granted'){
				// Use Notification API
				var notification = new Notification(alert.title,{'body':alert.message,'icon':alert.icon});
				notification.onclick = function(e){
					if (alert.url) document.location = alert.url;
					notification.close();
				};
				if (alert.timeout){
					setTimeout(function(){
						notification.close();
					}, alert.timeout);
				}
			} else {
				// Use bootstrap alerts system
				$scope.alerts.push(alert);
				if (alert.timeout) {
					setTimeout(function(){
						$scope.closeAlert($scope.alerts.length-1);
						$scope.$apply();
					}, alert.timeout);
				}
			}
		};
		
		$scope.$on('socket:alert', alertHandler);
		$scope.$on('alert', alertHandler);
		
		$scope.closeAlert = function(index){
			$scope.alerts.splice(index, 1);
		};
		
		$scope.$on('$stateChangeStart', function(){
			$scope.alerts = [];
		});
	})
	.run(function($log){
		$log.info('Module loaded: Notifications');
	})
	return nessa;
});