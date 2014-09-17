define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('auth', {
			
		}).state('login', {
			url: '/login',
			controller: 'loginCtrl',
			templateUrl: 'app/views/partials/login.html',
			data: {
			//	secure: true,
				title: 'Login'
			},
			onEnter: function(){
				console.error('Authentication: Required');
			}
		}).state('logout', {
			url: '/logout',
			data: {
				secure: false,
				title: 'Logging out'
			},
			onEnter: function($auth, $location){
				console.info('Authentication: Removed');
				$auth.logout().then(function(){
					$location.path('/login');
				});
			}
		});
	});
	
	nessa.controller('loginCtrl', function($auth, $rootScope, $scope, $state, $window){
		$scope.user = {};
		$scope.login = function(){
			$auth.login($scope.user.username, $scope.user.password, !!$scope.user.remember).then(function(success){
				console.info('Authentication: Success');
				$state.transitionTo('dashboard.default');
			}, function(error){
				if (error) console.error(error);
				console.error('Authentication: Fail');
			});
		};
	});
		
	nessa.run(function(){
		// Run after bootstrap
	});
	
	return nessa;
});