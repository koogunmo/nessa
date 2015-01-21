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
		})/*.state('downloads.info', {
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
		*/
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
		$scope.states = [
			{'type':'active','name':'Active'},
			{'type':'downloading','name':'Downloading'},
			{'type':'seeding','name':'Seeding'},
			{'type':'paused','name':'Paused'},
			{'type':'complete','name':'Complete'}
		];
		$scope.filter = {
			'active': false,
			'state': '',
			'title': ''
		};
		$scope.selected = [];
		
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
			$scope.filter.state = '';
		};
		$scope.filterList = function(item){
			if (!item.name.toLowerCase().match($scope.filter.title.toLowerCase())) return false;
			if ($scope.filter.state){
				switch ($scope.filter.state){
					case 'active':
						if ([4,6].indexOf(item.status) >= 0) return true;
						break;
					case 'complete':
						if (item.isFinished) return true;
						break;
					case 'downloading':
						if (item.status == 4) return true;
						break;
					case 'paused':
						if (item.status == 0) return true;
						break;
					case 'seeding':
						if (item.status == 6) return true;
						break;
				}
				return false;
			}
			return true;
		};
		
		$scope.pause = function(){
			$scope.selected.forEach(function(id){
				var downloads = $scope.downloads.filter(function(item){
					if (item.id == id) return true;
					return false;
				});
				if (downloads.length == 1){
					$http.post('/api/downloads/'+downloads[0].id,{'status':false});
				}
			});
			setTimeout(function(){$scope.$emit('DownloadsRefresh');},500)
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete these torrents?')){
				$scope.selected.forEach(function(id){
					var downloads = $scope.downloads.filter(function(item){
						if (item.id == id) return true;
						return false;
					});
					if (downloads.length == 1){
				//		$http.delete('/api/downloads/'+downloads[0].id);
					}
				});
				setTimeout(function(){$scope.$emit('DownloadsRefresh');},500)
			}
		};
		$scope.resume = function(){
			$scope.selected.forEach(function(id){
				var downloads = $scope.downloads.filter(function(item){
					if (item.id == id) return true;
					return false;
				});
				if (downloads.length == 1){
					 $http.post('/api/downloads/'+downloads[0].id,{'status':true});
				}
			});
			setTimeout(function(){$scope.$emit('DownloadsRefresh');},500)
		};
		
		$scope.$on('DownloadSelected', function(e,data){
			if (data.status){
				$scope.selected.push(data.id);
			} else {
				var index = $scope.selected.indexOf(data.id);
				$scope.selected.splice(index,1);
			}
		});
		$scope.$on('DownloadsRefresh', function(){
			$http.get('/api/downloads').success(function(json, status){
				$scope.downloads = json;
				$scope.selected = [];
			});
		});
		$scope.$emit('DownloadsRefresh');
	})
	
	nessa.controller('DownloadController', function($http,$interval,$log,$scope){
		$scope.active	= !!$scope.download.status;
		$scope.selected	= false;
		
		$scope.select = function(){
			$scope.selected = !$scope.selected;
			$scope.$emit('DownloadSelected', {'id':$scope.download.id,'status':$scope.selected});
		};
		
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