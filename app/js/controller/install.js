define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('install', {
			url: '/install',
			controller: 'installCtrl',
			templateUrl: 'views/partials/install.html',
			data: {
				secure: false,
				title: 'Install'
			}
		});
	});
	
	nessa.run(function($log){
		$log.info('Module loaded: Installer');
	});
	
	nessa.controller('installCtrl', function($http, $scope, $state){
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
	});
	
	return nessa;
});