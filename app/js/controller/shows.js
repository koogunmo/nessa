define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('shows', {
			abstract: true,
			url: '/shows',
			controller: 'showsCtrl',
			templateUrl: 'views/section/shows.html',
			data: {
				secure: true,
				title: 'Shows'
			}
		}).state('shows.index', {
			url: ''
		}).state('shows.add', {
			url: '/add',
			data: {
				title: 'Add Show'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/modal/show/search.html',
					controller: 'searchCtrl',
					windowClass: 'modal-add'
				}).result.then(function(result){
					$state.transitionTo('shows.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows.index');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('shows.random', {
			url: '/random',
			data: {
				title: 'Randomizer'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/modal/show/random.html',
					controller: 'showRandomCtrl',
					backdrop: true
				}).result.then(function(result){
					$state.transitionTo('shows.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows.index');
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
				title: 'Show Details'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/modal/show/detail.html',
					controller: 'showModalCtrl',
					backdrop: true,
					windowClass: 'modal-show'
				}).result.then(function(result){
					$state.transitionTo('shows.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows.index');
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
					$state.transitionTo('shows.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('shows.index');
					window.modal = null;				
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		});
	});
	
	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Shows');
		$rootScope.menu.push({
			path: 'shows.index',
			name: 'Shows',
			icon: 'th',
			order: 20
		});
		$rootScope.genres.shows = [
			'Action','Adventure','Animation',
			'Children','Comedy','Documentary','Drama',
			'Fantasy','Game Show','Home and Garden',
			'Mini Series','News','Reality',
			'Science Fiction','Soap','Special Interest',
			'Sport','Talk Show','Western'
		];
	});
	
	/****** Controller ******/
	
	nessa.controller('showsCtrl', function($http, $log, $rootScope, $scope){
		$scope.shows	= [];
		
		$scope.definiteArticle = function(show){
			return show.name.replace(/^The\s/i, '');
		};
		$scope.load = function(){
			$http.get('/api/shows').success(function(json, status){
				if (status == 200 && json) {
					$scope.shows = json;
				//	$(document).trigger('lazyload');
				}
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		
		// TODO: Rebuild show filtering
		$scope.filter = {
			active: false,
			genre: '',
			title: '',
			watched: false
		};
		$scope.paginate = {
			items: 24,
			page: 1
		};
		$scope.$watch('filter', function(){
			if ($scope.filter.title != '') $scope.paginate.page = 1;
		});
		
		$scope.clearFilter = function(){
			$scope.filter.title = '';
			$(document).trigger('lazyload');
		};
		
		$scope.filterList = function(item){
			if (!item.name.toLowerCase().match($scope.filter.title.toLowerCase())) return false;
			if ($scope.filter.active){
				if ($scope.filter.genre && item.genres.indexOf($scope.filter.genre) == -1) return false;
				if ($scope.filter.watched && item.progress && item.progress.left == 0) return false;
			}
			return true;
		};
		$scope.$on('showsRefresh', function(event, tvdb){
			$scope.load()
		});
		$scope.load();
	});
	
	nessa.controller('showCtrl', function($http, $log, $scope){
		var tvdb = parseInt($scope.show.tvdb);
		$scope.progress = function(){
			$http.get('/api/shows/'+tvdb+'/progress').success(function(json, status){
				$scope.show.progress = json;
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
	});
	
	nessa.controller('showModalCtrl', function($http, $log, $modalInstance, $rootScope, $scope, $stateParams){
		var tvdb = parseInt($stateParams.showid, 10);
		window.modal = $modalInstance;
		
		$scope.close = function(){
			$rootScope.$broadcast('showsRefresh', true);
			$modalInstance.close();
		};
		
		$scope.dismiss = function(){
			$modalInstance.dismiss();
		};
		
		$scope.downloadAll = function(){
			if (confirm('Are you sure you want to download all available episodes?')) {
				$http.post('/api/shows/'+tvdb+'/download').success(function(){
					$scope.close();
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.load = function(tvdb){
			$http.get('/api/shows/'+tvdb).success(function(json, status){
				if (status == 200 && json) $scope.show = json;
			}).error(function(json, status){
				$scope.dismiss();
			});
		};
		$scope.rescan = function(){
			$http.post('/api/shows/'+tvdb+'/scan').success(function(json, status){
				$rootScope.$broadcast('alert', {title: $scope.show.name, message: 'Rescan in progress...'});
				$scope.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				$http.delete('/api/shows/'+tvdb).success(function(){
					$rootScope.$broadcast('alert', {title: $scope.show.name, message: 'Show removed'});
					$scope.close();
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.save = function(){
			$http.post('/api/shows/'+tvdb, $scope.show).success(function(json, status){
				$rootScope.$broadcast('alert', {title: $scope.show.name, message: 'Changes saved'});
				$scope.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.update = function(){
			$http.post('/api/shows/'+tvdb+'/update').success(function(json, status){	
				$rootScope.$broadcast('alert', {title: $scope.show.name, message: 'Updating listings...'});
				$scope.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.watched = function(){
			var payload = {
				tvdb: $scope.episode.tvdb
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/watched', payload).success(function(json,status){
				$log.log(json, status);
			});
		};
		
		$scope.$on('showRefresh', function(e, tvdb){
			$log.info(tvdb);
			$scope.load(tvdb);
		});

		
		$scope.load(tvdb);
	});
	
	
	nessa.controller('seasonCtrl', function($log, $scope){
		$scope.display = function(){
			if ($scope.season.season == 0) {
				return 'Specials';
			} else {
				return 'Season '+$scope.season.season;
			}
		};
		$scope.watched = function(){
			var payload = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/watched', payload).success(function(json,status){
				$log.log(json, status);
			});
		};
	});
	
	nessa.controller('episodeCtrl', function($http, $log, $scope){
		$scope.collapsed = true;
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var payload = {
				tvdb: $scope.episode.tvdb,
				season: $scope.episode.season,
				episode: $scope.episode.episode,
				watched: $scope.episode.watched
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/watched', payload).success(function(json,status){
				$log.log(json, status);
			});
		};
		
		$scope.download = function(){
			var payload = {
				season: $scope.episode.season,
				episode: $scope.episode.episode
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/download', payload).success(function(json,status){
				$log.debug(json, status);
			});
		};
		
		$scope.canDownload = function(){
			if ($scope.episode.hash || $scope.episode.hashes){
				if ($scope.episode.downloading) return false;
				if ($scope.episode.file) return false;
				return true;
			}
			return false;
		};
		
		$scope.downloadStatus = function(){
			var status = '';
			if ($scope.episode.hash || $scope.episode.hashes) status = 'available';
			if ($scope.episode.file) status = 'downloaded';
			if ($scope.episode.downloading) status = 'downloading';
			
			return status;
		};
		
		$scope.hasAired = function(){
			return true;
			
		//	$log.debug($scope.episode.airdate.getTime(), new Date().now())
			
		//	return ($scope.episode.airdate && Number($scope.episode.airdate) < Number(new Date()));
		};
		
		/*
		$scope.hasAired = function(){
			return (!!$scope.episode.file || !!$scope.episode.hash || $scope.episode.airdate && $scope.episode.airdate*1000 < new Date().getTime());
		};
		*/
	});
	
	nessa.controller('matchCtrl', function($http, $modalInstance, $scope, $state){
		$scope.unmatched	= [];
		$scope.matched		= [];
		
		$http.get('/api/shows/unmatched').success(function(json,status){
			$scope.unmatched.push(json);
		});
		
		$scope.close = function(){
			$modalInstance.dismiss('close');
		};
		$scope.save = function(){
			$http.post('/api/shows/match', {matched: $scope.matched}).success(function(json,status){
				$scope.close();
			});
		};
		$scope.set = function(id, tvdb){
			$scope.matched[id] = {id: id, tvdb: tvdb};
		};
	});
	
	nessa.controller('searchCtrl', function($http, $log, $modalInstance, $rootScope, $scope){
		$scope.selected = null;
		$scope.filter = {
			query: ''
		};
		
		$scope.close = function(){
			$modalInstance.close();
		};
		$scope.reset = function(){
			$scope.selected = null;
			$scope.results = null;
			$scope.filter.query = '';
		};
		$scope.save = function(){
			$http.post('/api/shows', {tvdb: $scope.selected}).success(function(json, status){
				$rootScope.$broadcast('showsRefresh', $scope.selected);
				$modalInstance.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.search = function(){
			$http.post('/api/shows/search', {q: $scope.filter.query}).success(function(results, status){
				$scope.results = results;
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.select = function(tvdb) {
			$scope.selected = tvdb;
		};
	});
	
	nessa.controller('showRandomCtrl', function($http, $log, $modalInstance, $rootScope, $scope){
		$scope.random = null;
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.load = function(){
			$http.get('/api/shows/random').success(function(json, status){
				$scope.random = json;
			}).error(function(json, status){
				$log.error(json, status);	
			});
		};
		$scope.load();
	});

	return nessa;
});