define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('shows', {
			url: '/shows',
			controller: 'showsCtrl',
			templateUrl: 'views/partials/shows.html',
			data: {
				secure: true,
				title: 'Shows'
			}
		}).state('shows.add', {
			url: '/add',
			data: {
				secure: true
			},
			onEnter: function($state, $stateParams, $modal){
				$modal.open({
					templateUrl: 'views/modal/show/search.html',
					controller: 'searchCtrl',
					windowClass: 'modal-add'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
			
		}).state('shows.detail', {
			url: '/{showid:[0-9]+}',
			data: {
				secure: true
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/modal/show/detail.html',
					controller: 'showCtrl',
					backdrop: 'static',
					windowClass: 'modal-show'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('shows.match', {
			url: '/match',
			data: {
				secure: true,
				title: 'Unmatched Shows'
			},
			onEnter: function($modal, $state){
				$modal.open({
					templateUrl: 'views/modal/show/match.html',
					controller: 'matchCtrl',
					backdrop: 'static'
				}).result.then(function(result){
					$state.transitionTo('shows');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		});
	});
	
	/****** Controller ******/
	
	nessa.controller('showsCtrl', function($http, $rootScope, $scope, $socket){
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
	});
	
	nessa.controller('showCtrl', function($http, $modalInstance, $scope, $socket, $stateParams){
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
	});
	
	nessa.controller('seasonCtrl', function($scope, $socket){
		$scope.seen = true;
		
		angular.forEach($scope.$parent.season.episodes, function(v,k){
			if (!v.watched) $scope.seen = false;
		});
		
		$scope.display = function(){
			if ($scope.season.season == 0) {
				return 'Specials';
			} else {
				return 'Season '+$scope.season.season;
			}
		};
		
		$scope.watched = function(){
			$scope.seen = true;
			var data = {
				tvdb: $scope.$parent.season.episodes[0].tvdb,
				season: $scope.$parent.season.season 
			};
			$socket.emit('show.season.watched', data);
		};
	});
	
	nessa.controller('episodeCtrl', function($scope, $socket){
		$scope.collapsed = true;
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var data = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode,
				watched: $scope.episode.watched
			};
			$socket.emit('show.episode.watched', data);
		};
		
		$scope.download = function(){
			var payload = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode
			};
			$socket.emit('show.episode.download', payload);
		};
		
		$scope.canDownload = function(){
			if ($scope.episode.hash && $scope.episode.status === undefined) {
				return true;
			}
			return false;
		};
		
		$scope.hasAired = function(){
			return (!!$scope.episode.file || $scope.episode.airdate && $scope.episode.airdate*1000 < new Date().getTime());
		};
	});
	
	return nessa;
});