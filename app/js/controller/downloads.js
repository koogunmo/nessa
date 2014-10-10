define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('downloads', {
			url: '/downloads',
			controller: 'downloadsCtrl',
			templateUrl: 'views/partials/downloads.html',
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
					controller: 'downloadCtrl',
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
	
	nessa.controller('downloadsCtrl', function($http, $modal, $rootScope, $scope, $socket){
		$scope.predicate = 'name';
		$scope.reverse = false;
		$scope.downloads = [];
		
		$http.get('/api/downloads').success(function(json, status){
			$scope.downloads = json;
		});
	});
	
	nessa.controller('downloadCtrlTest', function($http, $modal, $scope, $socket){
		$scope.active	= false;
		$scope.selected	= false;
		
		$scope.start = function(){
			$scope.active = true;
		};
		$scope.stop = function(){
			$scope.active = false;
		};
		$scope.update = function(){
			if ($scope.active){
				/*
				$http.get('/api/downloads/'+$scope.download.id).success(function(json, status){
					$scope.downloads = json;
				});
				*/
			}
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
				$modalInstance.close();
			});
		};
	});
	
	
	
	nessa.controller('downloadCtrl', function($http, $modalInstance, $scope, $socket, $state, $stateParams){
		$scope.torrent = {};
		// fetch info
		
		$socket.emit('download.info', $stateParams.id);
		$socket.on('download.info', function(data){
			if (data.id != $stateParams.id) return;
			$scope.torrent = data;
		});
		$scope.remove = function(){
			if (confirm('Are you sure you want to delete this torrent?')) {
				/*
				$http.delete('/api/downloads/'+$scope.torrent.id).success(function(json, status){
					$modalInstance.dismiss('close');
				}).error(function(json, status){
					console.error(json,status);
				});
				*/
				$socket.emit('download.remove', {id: $scope.torrent.id, purge: true});
				$modalInstance.dismiss('close');
			}
		};
		$scope.toggle = function(){
			$scope.torrent.status = !$scope.torrent.status;
			if ($scope.torrent.status){
				$socket.emit('download.start', $scope.torrent.id);
			} else {
				$socket.emit('download.stop', $scope.torrent.id);
			}
		};
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.save = function(){
			$modalInstance.close();
		};
	});
	
	return nessa;
});