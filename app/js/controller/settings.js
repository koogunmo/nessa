define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		
		$stateProvider.state('settings', {
			abstract: true,
			url: '/settings',
			controller: 'settingsCtrl',
			templateUrl: 'views/partials/settings.html',
			data: {
				secure: true,
				title: 'Settings'
			}
		}).state('settings.index', {
			url: ''
		});
		
		$stateProvider.state('settings.user', {
			abstract: true,
			url: '/user'
			
		}).state('settings.user.add', {
			url: '/add',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl'
				}).result.then(function(result){
					$state.transitionTo('settings.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings.index');
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
					$state.transitionTo('settings.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('settings.index');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		});
		
		$stateProvider.state('profile', {
			url: '/profile',
			data: {
				secure: true,
				title: 'Profile'
			},
			onEnter: function($modal, $rootScope, $state){
				var previous = ($rootScope.stateFrom.name) ? $rootScope.stateFrom.name : 'dashboard';
				$modal.open({
					templateUrl: 'views/modal/user.html',
					controller: 'userCtrl'
				}).result.then(function(result){
					$state.transitionTo(previous);
					window.modal = null;
				}, function(result){
					$state.transitionTo(previous);
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss();
				window.modal = null;
			}
		});
		
	});
	
	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Settings');
		$rootScope.menu.push({
			path: 'settings.index',
			name: 'Settings',
			icon: 'gears',
			order: 100
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('settingsCtrl', function($http, $log, $modal, $rootScope, $scope){
		$scope.settings = {}
		$scope.branches = [{name: 'master'},{name: 'nightly'}];
		$scope.users = [];
		
		$http.get('/api/system/settings').success(function(json,status){
			$scope.settings = json;
		}).error(function(json,status){
			$log.error(json,status);
		});
		
		$http.get('/api/users').success(function(json,status){
			$scope.users = json;
		}).error(function(json,status){
			$log.error(json,status);
		});
		
		$scope.latest = function(){
			if (confirm('A. This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
		//		$http.post('/api/system', {action: 'latest'});
			}
		};
		$scope.listings = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$http.post('/api/system', {action: 'listings'});
			}
		};
		$scope.reboot = function(){
			if (confirm('This will restart NodeTV. Are you sure?')) {
				$http.post('/api/system', {action: 'restart'}).success(function(){
					$rootScope.$broadcast('alert', {message: 'Restarting...'});
				});
			}
		};
		$scope.rescan = function(){
			if (confirm('WARNING: NodeTV will probably become VERY laggy during a full rescan. Continue anyway?')) {
				$http.post('/api/system', {action: 'rescan'}).success(function(){
					$rootScope.$broadcast('alert', {message: 'Full rescan in progress'});
				});
			}
		};
		$scope.save = function(){
			$http.post('/api/system/settings', $scope.settings).success(function(){
				$rootScope.$broadcast('alert', {message: 'Settings saved'});
			});
		};
		$scope.update = function(){
			if (confirm('This will force NodeTV to update to the latest version. Are you sure?')) {
				$http.post('/api/system', {action: 'update'}).success(function(){
					$rootScope.$broadcast('alert', {message: 'Update in progress'});
				});
			}
		};
	});
	
	
	
	nessa.controller('userCtrl', function($http, $log, $modalInstance, $rootScope, $scope, $state, $stateParams){
		window.modal = $modalInstance;
		$scope.user = {};
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.load = function(id){
			$http.get('/api/user/'+id).success(function(json, status){
				
				$log.info(json);
				
				$scope.user = json;
			});
		};
		
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this user?')){
				$http.delete('/api/user/'+id).success(function(json, status){
					$modalInstance.close();
				});
			}
		};
		
		$scope.save = function(){
			$http.post('/api/user/'+id, $scope.user).success(function(json, status){
				$log.log(json, status);
		//		$modalInstance.close();
			});
		};
		if ($state.current.name != 'settings.user.add'){
			var id = ($stateParams && $stateParams.id) ? $stateParams.id : $rootScope.user._id;
			$scope.load(id);
		}
	});
	
	return nessa;
});