define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('downloads', {
			url: '/downloads',
			controller: 'downloadsCtrl',
			templateUrl: 'views/section/downloads.html',
			data: {
				secure: true,
				title: 'Downloads'
			}
			
		}).state('downloads.add', {
			url: '/add',
			onEnter: function($state, $modal){
				$modal.open({
					controller: 'downloadAddCtrl',
					templateUrl: 'views/modal/download/add.html'
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				}, function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('downloads.info', {
			url: '/{id:[0-9]{1,}}',
			data: {
				secure: true
			},
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					controller: 'downloadModalCtrl',
					templateUrl: 'views/modal/download/settings.html'
				}).result.then(function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				}, function(result){
					$state.transitionTo('downloads');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		});
		
	});
	
	nessa.run(function($log, $rootScope, $socket){
		$log.info('Module loaded: Downloads');
		$rootScope.downloads = [];
		
		$rootScope.menu.push({
			path: 'downloads',
			name: 'Downloads',
			icon: 'download',
			order: 40
		});
	});
	
	/****** Controllers ******/
	
	nessa.controller('downloadsCtrl', function($http, $log, $rootScope, $scope, $socket){
		$scope.predicate = 'name';
		$scope.reverse = false;
		$scope.downloads = [];
		
		$scope.load = function(){
			$http.get('/api/downloads').success(function(json, status){
				$scope.downloads = json;
			});
		};
		$scope.$on('downloadsRefresh', function(){
			$scope.load();
		});
		$scope.load();
	});
	
	nessa.controller('downloadCtrl', function($http, $log, $scope, $socket){
		$scope.active	= !!$scope.download.status;
		$scope.selected	= false;
		
		$scope.startStop = function(){
			$scope.active = !$scope.active;
			$http.post('/api/downloads/'+$scope.download.id, {status: $scope.active}).success(function(json, status){
				$log.log(json);
			//	$scope.download = json;
			});
		};
		$scope.interval = setInterval(function(){
			if (!$scope.active) return;
			$http.get('/api/downloads/'+$scope.download.id).success(function(json, status){
				$scope.active = !!json.status;
				$scope.download = json;
			});
		}, 5000);
	});
	
	nessa.controller('downloadModalCtrl', function($http, $log, $modalInstance, $rootScope, $scope, $state, $stateParams){
		
		$scope.download = {};
		
		$http.get('/api/downloads/'+$stateParams.id).success(function(json, status){
			$scope.active = !!json.status;
			$scope.download = json;
		}).error(function(){
			$modalInstance.dismiss();
		});
		
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this torrent?')) {
				$http.delete('/api/downloads/'+$scope.torrent.id).success(function(json, status){
					$rootScope.$broadcast('alert', {title: $scope.download.name, message: 'Download removed'});
					$rootScope.$broadcast('downloadsRefresh');
					$modalInstance.close('close');
				}).error(function(json, status){
					$log.error(json,status);
				});
				$modalInstance.dismiss('close');
			}
		};
		$scope.toggle = function(){
			$scope.torrent.status = !$scope.torrent.status;
			if ($scope.torrent.status){
		//		$socket.emit('download.start', $scope.torrent.id);
			} else {
		//		$socket.emit('download.stop', $scope.torrent.id);
			}
		};
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.save = function(){
			$modalInstance.close();
		};
	});
	
	
	
	
	nessa.controller('downloadAddCtrl', function($modalInstance, $scope, $socket){
		window.modal = $modalInstance;

		$scope.magnet = {
			url: null
		};
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		
		$scope.save = function(){
			$http.post('/api/downloads', {url: $scope.magnet.url}).success(function(json, status){
				$rootScope.$broadcast('alert', {message: 'Download Added'});
				$rootScope.$broadcast('downloadsRefresh');
				$modalInstance.close();
			}).error(function(){
				$modalInstance.dismiss();
			});
		};
	});
	
	return nessa;
});