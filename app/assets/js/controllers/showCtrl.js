define(function(){
	return function($http, $modalInstance, $scope, $socket, $stateParams){
		window.modal = $modalInstance;
		
		var tvdb = parseInt($stateParams.showid, 10);
		$http.get('/api/shows/'+tvdb).success(function(json, status){
			if (status == 200 && json) {
				$scope.summary = json.summary;
				$scope.listing = json.listing;
				$scope.total = json.total;
			}
		}).error(function(json, status){
			console.error(json, status);
			$scope.close();
		});
		
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.downloadAll = function(){
			if (confirm('Are you sure you want to download all available episodes?')) {
				$http.get('/api/shows/'+tvdb+'/download').success(function(){
					$modalInstance.close();
				}).error(function(json, status){
					console.error(json, status);
				});
			}
		};
		$scope.rescan = function(){
			$http.get('/api/shows/'+tvdb+'/rescan').success(function(json, status){
				$modalInstance.close();
			}).error(function(json, status){
				console.error(json, status);
			});
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				$http.delete('/api/shows/'+tvdb).success(function(){
					$modalInstance.close();
				}).error(function(json, status){
					console.error(json, status);
				});
			}
		};
		$scope.save = function(){
			$http.post('/api/shows/'+tvdb, $scope.summary).success(function(json, status){
				$modalInstance.close();
			}).error(function(json, status){
				console.error(json, status);
			});
		};
		$scope.update = function(){
			$http.get('/api/shows/'+tvdb+'/update').success(function(json, status){
				$modalInstance.close();
			}).error(function(json, status){
				console.error(json, status);
			});
		};
		$scope.watched = function(){
		//	$socket.emit('show.watched', {tvdb: tvdb});
		};
	}
});