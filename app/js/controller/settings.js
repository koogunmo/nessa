define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		
		$stateProvider.state('settings', {
			abstract: true,
			url: '/settings',
			controller: 'SettingsController',
			templateUrl: 'views/settings/index.html',
			data: {
				secure: true,
				title: 'Settings'
			}
		}).state('settings.index', {
			url: ''
		});
		
		
		$stateProvider.state('settings.user', {
			abstract: true,
			url: '/user',
			data:{'secure':true}
			
		}).state('settings.user.add', {
			url: '/add',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/settings/modal/user.html',
					controller: 'UserController'
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
			url: '/:id',
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/settings/modal/user.html',
					controller: 'UserController',
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
	});
	
	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Settings');
		$rootScope.menu.push({
			'icon': 'gears',
			'name': 'Settings',
			'path': 'settings.index',
			'root': 'settings',
			'sort': 100
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('SettingsController', function($http, $log, $modal, $rootScope, $scope){
		
		$scope.branches = [{name: 'master'},{name: 'nightly'}];
		$scope.settings = {}
		$scope.users = [];
		
		$http.get('/api/system/settings').success(function(json,status){
			$scope.settings = json;
		});
		
		$scope.library = {
			movies: {
				genres: function(){
					$http.post('/api/movies/genres');
				},
				rescan: function(){
					$http.post('/api/movies/scan');
				},
				resync: function(){
					$http.post('/api/movies/sync');
				}
			},
			shows: {
				listings: function(){
					$http.post('/api/shows/listings');
				},
				rescan: function(){
					$http.post('/api/shows/scan');
				},
				resync: function(){
					$http.post('/api/shows/sync');
				}
			}
		};
		
		$scope.actions = {
			reboot: function(){
				if (confirm('This will restart NodeTV. Are you sure?')) {
					$http.post('/api/system/restart');
				}
			},
			update: function(){
				if (confirm('This will update NodeTV to the latest version. Are you sure?')) {
					$http.post('/api/system/update');
				}
			}
		};
		
		
		
		
		
		
		$scope.listings = function(){
			if (confirm('This will update all show listings and artwork. NodeTV may become VERY laggy. Continue anyway?')) {
				$http.post('/api/system', {action: 'listings'});
			}
		};
		$scope.loadUsers = function(){
			$http.get('/api/users').success(function(json,status){
				$scope.users = json;
			}).error(function(json,status){
				$log.error(json,status);
			});
		};
		$scope.reboot = function(){
			if (confirm('This will restart NodeTV. Are you sure?')) {
				$http.post('/api/system/restart');
			}
		};
		$scope.save = function(){
			$http.post('/api/system/settings', $scope.settings).success(function(){
				$rootScope.$broadcast('alert', {message: 'Settings saved'});
			});
		};
		
		$scope.$on('usersRefresh', function(){
			$scope.loadUsers();
		});
		$scope.loadUsers();
	});
	
	
	
	
	nessa.controller('UserController', function($http,$localStorage,$log,$modalInstance,$rootScope,$scope,$state,$stateParams){
		window.modal = $modalInstance;
		
		$scope.adding = false;
		$scope.user = {};
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		
		$scope.load = function(id){
			$http.get('/api/users/'+id).success(function(json, status){
				$scope.user = json;
			});
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this user?')){
				$http.delete('/api/users/'+id).success(function(json, status){
					$rootScope.$broadcast('userRefresh');
					$modalInstance.close();
				});
			}
		};
		$scope.save = function(){
			var path = ($state.current.name == 'settings.user.add') ? '/api/users' : '/api/users/'+id;
			$http.post(path, $scope.user).success(function(json, status){
				$rootScope.$broadcast('usersRefresh');
				$modalInstance.close();
			});
		};
		if ($state.current.name == 'settings.user.add'){
			$scope.adding = true;
		} else {
			$scope.$storage = $localStorage;
			var id = ($stateParams && $stateParams.id) ? $stateParams.id : $scope.$storage.user.username;
			$scope.load(id);
		}
	});
	
	return nessa;
});