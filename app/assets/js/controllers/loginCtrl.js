define(function(){
	return function($auth, $rootScope, $scope, $state, $window){
		$scope.user = {};
		$scope.login = function(){
			$auth.login($scope.user.username, $scope.user.password, !!$scope.user.remember).then(function(success){
				$state.transitionTo('dashboard');
			}, function(error){
				if (error) console.error(error);
				/*
				$socket.emit('system.alert', {
					type: 'danger',
					message: 'Incorrect login details'
				});
				*/
			});
		};
	}
});