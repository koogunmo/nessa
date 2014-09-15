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
	
	nessa.controller('moviesCtrl', function($http, $rootScope, $scope){
		$scope.settings	= {};
		$scope.movies	= [];
		
		$scope.filter	= {
			string: {
				title: ''
			}
		};
		
		$scope.clearFilter = function(){
			$scope.filter.string.name = '';
			$(document).trigger('lazyload');
		};
		
		$http.get('/api/system/settings').success(function(json,status){
			$rootScope.settings = json.media;
			$scope.settings = json.media;
		});
		
		$http.get('/api/movies').success(function(json, status){
			
			console.log(json, status);
			
			if (status == 200 && json) {
				$scope.movies = json;
				$(document).trigger('lazyload');
			}
		}).error(function(json, status){
			console.error(json, status);
		});
		
	});
	
	return nessa;
})