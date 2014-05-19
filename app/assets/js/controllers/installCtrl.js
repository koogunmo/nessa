define(function(){
	return function($http, $scope, $socket, $state){
		$scope.settings = {};
		$scope.save = function(){
			$http.post('/api/system/settings', $scope.settings);
			$state.transitionTo('shows.match');
		};
		
		$http.get('/api/system/settings').success(function(json,status){
			$scope.settings = json;
			
		}).error(function(json,status){
			console.error(json,status);
		});
	};
});