define(['app'], function(nessa){
	
	nessa.controller('NavigationController', function($http,$location,$log,$scope,$state){
		$scope.authenticated = true;
		$scope.isCollapsed = true;
		$scope.state = $state;
		
		$scope.collapse = function(){
			$scope.isCollapsed = true;
		};
		$scope.toggle = function(){
			$scope.isCollapsed = !$scope.isCollapsed;
		};
		
		
		/*
		$scope.$on('authenticated', function(e,status){
			$scope.authenticated = !!status;
		});
		*/
	})
	
	nessa.controller('headCtrl', function($scope, $state){
		
	});
	
	nessa.controller('alertsCtrl', function($log,$scope,$socket){
		$scope.alerts = [];
		
		var alertHandler = function(e,alert){
			var defaults = {
				icon: '/assets/gfx/icons/touch-icon.png',
				message: '',
				timeout: 3000,
				title: 'NodeTV',
				type: 'info',
				url: false
			};
			var alert = angular.extend({}, defaults, alert);
			if (('Notification' in window) && Notification.permission === 'granted'){
				// Use Notification API
				var notification = new Notification(alert.title, {body: alert.message, icon: alert.icon});
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
		
		$scope.$on('$stateChangeSuccess', function(){
			$scope.alerts = [];
		});
	});
	
	nessa.controller('navCtrl', function($location, $log, $rootScope, $scope, $state){
		$scope.menu = $rootScope.menu;
		$scope.state = $state;
		
		$scope.authenticated = true;
		
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