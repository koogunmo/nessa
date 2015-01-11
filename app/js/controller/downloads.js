define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('downloads', {
			url: '/downloads',
			controller: 'DownloadsController',
			templateUrl: 'views/downloads/index.html',
			data: {
				secure: true,
				title: 'Downloads'
			}
			
		}).state('downloads.add', {
			// Deprecate this?
			url: '/add',
			onEnter: function($modal,$state){
				$modal.open({
					controller: 'DownloadAddController',
					templateUrl: 'views/downloads/modal/add.html'
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
			onEnter: function($modal,$state,$stateParams){
				$modal.open({
					controller: 'DownloadDetailController',
					templateUrl: 'views/downloads/modal/settings.html'
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
	})
	
	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Downloads');
		$rootScope.menu.push({
			path: 'downloads',
			name: 'Downloads',
			icon: 'download',
			order: 40
		});
	})
	
	/****** Controllers ******/
	
	nessa.controller('DownloadsController', function($http,$log,$modal,$scope){
		$scope.downloads = [];
		$scope.filter = {
			active: false,
			title: '',
			status: ''
		};
		
		$scope.add = function(){
			$modal.open({
				'controller': 'DownloadAddController',
				'templateUrl': 'views/downloads/modal/add.html'
			}).result.then(function(){
				$scope.$emit('DownloadsRefresh');
			});
		};
		$scope.filterClear = function(){
			$scope.filter.title = '';
		};
		$scope.filterList = function(item){
			if (!item.name.toLowerCase().match($scope.filter.title.toLowerCase())) return false;
			if ($scope.filter.active){
				if ($scope.filter.status != '' && item.status != $scope.filter.status) return false;
			}
			return true;
		};
		
		$scope.$on('DownloadsRefresh', function(){
			$log.debug('Refreshing...');
			$http.get('/api/downloads').success(function(json, status){
				$scope.downloads = json;
			});
		});
		$scope.$emit('DownloadsRefresh');
	})
	
	nessa.controller('DownloadController', function($http,$interval,$log,$scope){
		$scope.active	= !!$scope.download.status;
		$scope.selected	= false;
		
		$scope.startStop = function(){
			$scope.active = !$scope.active;
			$http.post('/api/downloads/'+$scope.download.id, {'status':$scope.active}).success(function(json, status){
				$log.log(json);
			//	$scope.download = json;
			});
		};
		$scope.polling = $interval(function(){
			if (!$scope.active) return;
			$http.get('/api/downloads/'+$scope.download.id).success(function(json, status){
				$scope.active = !!json.status;
				$scope.download = json;
			});
		}, 5000);
		
		$scope.$on('$destroy', function(){
			$interval.cancel($scope.polling);
		});
	})

	nessa.controller('DownloadAddController', function($http,$log,$modalInstance,$scope){
		$scope.magnet = {'url':''};
		
		$scope.$emit('DownloadsRefresh');
		$scope.dismiss = function(){
			$modalInstance.dismiss()
		};
		$scope.save = function(){
			$http.post('/api/downloads', {url: $scope.magnet.url}).success(function(json, status){
				$modalInstance.close();
			}).error(function(){
				$modalInstance.dismiss();
			});
		};
	})
	
	nessa.controller('DownloadDetailController', function($http,$log,$modalInstance,$scope,$state,$stateParams){
		$scope.download = null;
		
		$http.get('/api/downloads/'+$stateParams.id).success(function(json,status){
			$scope.active = !!json.status;
			$scope.download = json;
		}).error(function(){
			$modalInstance.dismiss();
		});
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this torrent?')) {
				$http.delete('/api/downloads/'+$scope.download.id).success(function(json,status){
					$scope.$emit('DownloadsRefresh');
					$modalInstance.close();
				}).error(function(json, status){
					$log.error(json,status);
				});
				$modalInstance.dismiss();
			}
		};
		$scope.save = function(){
			$modalInstance.close();
		};
	})
	
	
	

	
	
	nessa.controller('downloadModalCtrl', function($http, $log, $modalInstance, $rootScope, $scope, $state, $stateParams){
		
		$scope.download = {};
		
		$http.get('/api/downloads/'+$stateParams.id).success(function(json, status){
			$scope.active = !!json.status;
			$scope.download = json;
		}).error(function(){
			$modalInstance.dismiss();
		});
		
		$scope.remove = function(){
			
			console.log($scope.download.id);
			
			if (confirm('Are you sure you want to delete this torrent?')) {
				$http.delete('/api/downloads/'+$scope.download.id).success(function(json, status){
					$rootScope.$broadcast('alert', {title: $scope.download.name, message: 'Download removed'});
					$rootScope.$broadcast('downloadsRefresh');
					$modalInstance.close('close');
				}).error(function(json, status){
					$log.error(json,status);
				});
				$modalInstance.dismiss('close');
			}
		};
		/*
		$scope.toggle = function(){
			$scope.torrent.status = !$scope.torrent.status;
			if ($scope.torrent.status){
		//		$socket.emit('download.start', $scope.torrent.id);
			} else {
		//		$socket.emit('download.stop', $scope.torrent.id);
			}
		};
		*/
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.save = function(){
			$modalInstance.close();
		};
	});
	
	
	
	
	nessa.controller('downloadAddCtrl', function($modalInstance, $scope){
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