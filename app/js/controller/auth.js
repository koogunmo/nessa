define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('login', {
			url: '/login',
			controller: 'loginCtrl',
			templateUrl: 'app/views/partials/login.html',
			data: {
				secure: false,
				title: 'Login'
			},
			onEnter: function(){
				console.warn('Authentication: Required');
			}
		}).state('logout', {
			url: '/logout',
			data: {
				secure: true,
				title: 'Logging out'
			},
			onEnter: function($auth, $state){
				$auth.logout().then(function(){
					console.warn('Authentication: Removed');
					$state.transitionTo('login');
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
				console.warn('Authentication: Failed');
			});
		};
	});
		
	nessa.run(function($auth, $state){
		$auth.check().then(null, function(error){
			$state.transitionTo('login');
		});
	});
	
	return nessa;
});