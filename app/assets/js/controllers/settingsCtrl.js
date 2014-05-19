define(function(){
	return function($http, $modal, $scope, $socket){
		$scope.settings = {}
		$scope.branches = [{name: 'master'},{name: 'nightly'}];
		$scope.users = [];
		
		$http.get('/api/system/settings').success(function(json,status){
			$scope.settings = json;
			
		}).error(function(json,status){
			console.error(json,status);
		});
		
		$http.get('/api/users').success(function(json,status){
//			$scope.users = json;
			
		}).error(function(json,status){
			console.error(json,status);
		});
		
		$scope.save = function(){
			$http.post('/api/system/settings', $scope.settings);
		};
		$scope.latest = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$http.post('/api/system', {action: 'latest'});
			}
		};
		$scope.listings = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$http.post('/api/system', {action: 'listings'});
			}
		};
		$scope.rescan = function(){
			if (confirm('WARNING: NodeTV will probably become VERY laggy during a full rescan. Continue anyway?')) {
				$http.post('/api/system', {action: 'rescan'});
			}
		};
		$scope.reboot = function(){
			if (confirm('This will restart NodeTV. Are you sure?')) {
				$http.post('/api/system', {action: 'restart'});
			}
		};
		$scope.update = function(){
			if (confirm('This will force NodeTV to update to the latest version. Are you sure?')) {
				$http.post('/api/system', {action: 'update'});
			}
		};
	}
});