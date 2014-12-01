define(['app'], function(nessa){
	
//	angular.module('tvAuth',['ui.router'])
	
	nessa.config(function($stateProvider){
		$stateProvider.state('login', {
			url: '/login',
			controller: 'loginCtrl',
			templateUrl: 'app/views/section/login.html',
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
				title: 'Logging out'
			},
			onEnter: function($auth, $log, $state){
				$auth.logout().then(function(){
					$log.warn('Authentication: Removed');
					$state.transitionTo('login');
				});
			}
		});
	});
	
	nessa.controller('loginCtrl', function($auth, $log, $rootScope, $scope, $state, $window){
		$scope.user = {};
		$scope.login = function(){
			$auth.login($scope.user.username, $scope.user.password, !!$scope.user.remember).then(function(json){
				if (json.success){
					$log.info('Authentication: Success');
					$state.transitionTo('dashboard');
				}
			}, function(json,status){
				// Form feedback
				$rootScope.$broadcast('alert', {message: 'Login failed. Please try again'})
				$log.warn('Authentication: Failed');
			});
		};
		$scope.reset = function(){
			$scope.error = null;
		};
		if ($rootScope.$storage.session) $state.transitionTo('dashboard');
	});
		
	nessa.run(function($auth, $log, $state){
		$log.info('Module loaded: Authentication');
		$auth.check().then(function(json){
		//	$state.transitionTo('dashboard');
		},function(error){
			$state.transitionTo('login');
		});
	});
	
	return nessa;
});