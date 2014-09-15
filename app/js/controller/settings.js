define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('settings', {
			url: '/settings',
			controller: 'settingsCtrl',
			templateUrl: 'views/partials/settings.html',
			data: {
				secure: true,
				title: 'Settings'
			}
		}).state('settings.user', {
			abstract: true,
			url: '/user'
		}).state('settings.user.add', {
			url: '/add',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('settings');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		}).state('settings.user.edit', {
			url: '/edit/{id:[0-9a-f]{24}}',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('settings');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('settingsCtrl', function($http, $modal, $scope, $socket){
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
	});

	nessa.controller('userCtrl', function($modalInstance, $scope, $socket, $state, $stateParams){
		window.modal = $modalInstance;
		$scope.user = {};
		if ($stateParams.id) {
			var id = $stateParams.id;
			$socket.emit('system.user', id);
			$socket.on('system.user', function(json){
				delete json.password
				$scope.user = json;
			});
		}
		$scope.remove = function(){
			if (confirm('Are you sure?')){
				$socket.emit('system.user.remove', $scope.user._id);
				$modalInstance.close();
			}
		};
		$scope.save = function(){
			$socket.emit('system.user.update', $scope.user);
			$modalInstance.close();
		};
		$scope.close = function(){
			$modalInstance.dismiss();
		};
	});		
	
	return nessa;
});