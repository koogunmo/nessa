define(function(){
	return function($http, $rootScope, $scope, $socket){
		$scope.settings = {};
		$scope.shows	= [];
		
		$scope.filter	= {
			string: {
				name: ''
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
		
		$http.get('/api/shows').success(function(json, status){
			if (status == 200 && json) {
				$scope.shows = json;
				$(document).trigger('lazyload');
			}
		}).error(function(json, status){
			console.error(json, status);
		});
	}
});