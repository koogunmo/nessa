define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('movies', {
			url: '/movies',
			controller: 'moviesCtrl',
			templateUrl: 'views/partials/movies.html',
			data: {
				secure: true,
				title: 'Movies'
			}
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('moviesCtrl', function($http, $scope){
		
		
		
	});
	
	return nessa;
})