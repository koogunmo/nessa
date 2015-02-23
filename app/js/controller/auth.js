define(['app'], function(nessa){
	
//	angular.module('tvAuth',['ngAnimate','ui.router'])
	
	nessa.config(function($stateProvider){
		$stateProvider.state('login', {
			url: '/login',
			controller: 'LoginController',
			templateUrl: 'views/auth/login.html',
			data: {
				secure: false,
				title: 'Login'
			},
			onEnter: function($log){
				$log.warn('Authentication: Required');
			}
		}).state('logout', {
			url: '/logout',
			data: {
				secure: true,
				title: 'Logging out...'
			},
			onEnter: function($auth, $log, $state){
				$auth.logout().then(function(){
					$log.warn('Authentication: Removed');
					$state.go('login');
				});
			}
		});
	});
	
	nessa.controller('LoginController', function($auth,$log,$scope,$state){
		$scope.user = {};
		$scope.login = function(){
			$auth.login($scope.user.username, $scope.user.password, !!$scope.user.remember).then(function(json){
				$log.info('Authentication: Success');
				$state.go('dashboard.shows');
			}, function(json){
				$log.warn('Authentication: Failed');
				$scope.user = {};
			});
		};
	});
	
	nessa.run(function($log){
		$log.info('Module loaded: Authentication');
	});
	
	return nessa;
});