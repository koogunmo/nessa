define(['app'], function(nessa){
	
//	angular.module('tv.shows', ['ngAnimate','ngMessages','ngStorage','ui.bootstrap','ui.router']);	
//	angular.module('tv.shows')
	
	nessa.config(function($stateProvider){
		$stateProvider.state('shows', {
			abstract: true,
			url: '/shows',
			templateUrl: 'views/shows/index.html',
			data: {
				secure: true,
				title: 'Shows'
			}
		}).state('shows.match', {
			url: '/match',
			controller: 'ShowsMatchController',
			templateUrl: 'views/shows/match.html',
			data: {
				secure: true,
				title: 'Unmatched Shows'
			}
		}).state('shows.index', {
			url: '',
			controller: 'ShowsController',
			templateUrl: 'views/shows/grid.html',
			
		}).state('shows.index.add', {
			url: '/add',
			data: {
				title: 'Add Show'
			},
			onEnter: function($modal,$state,$stateParams){
				$modal.open({
					templateUrl: 'views/shows/modal/search.html',
					controller: 'ShowsSearchController',
					windowClass: 'modal-add'
				}).result.then(function(result){
					$state.transitionTo('shows.index');
				//	window.modal = null;
				}, function(result){
					$state.transitionTo('shows.index');
				//	window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		}).state('shows.index.random', {
			url: '/random',
			data: {
				title: 'Randomizer'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/shows/modal/random.html',
					controller: 'ShowsRandomController',
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
			
		}).state('shows.index.detail', {
			url: '/{tvdb:[0-9]+}',
			data: {
				title: 'Show Info'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/shows/modal/detail.html',
					controller: 'ShowDetailController',
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
		})
	})
	
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
	})
	
	/****** Controller ******/
	
	nessa.controller('ShowsController', function($http,$log,$modal,$scope){
		$scope.shows	= [];
		
		$scope.definiteArticle = function(show){
			return show.name.replace(/^The\s/i, '');
		};
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
		
		$scope.$on('ShowsRefresh', function(event, tvdb){
			$http.get('/api/shows').success(function(json, status){
				if (status == 200 && json) {
					$scope.shows = json;
				}
			}).error(function(json, status){
				$log.error(json, status);
			});
		});
		
		$scope.$watch('filter', function(){
			if ($scope.filter.title != '') $scope.paginate.page = 1;
		});
		
		$scope.addShow = function(){
			$modal.open({
				'backdrop': 'static',
				'controller': 'ShowsSearchController',
				'templateUrl': 'views/shows/modal/search.html'
			}).result.then(function(resolve){
				$scope.$emit('ShowsRefresh');
			},function(reject){
				// Nothing?
			});
		};
		
		$scope.clearFilter = function(){
			$scope.filter.title = '';
		};
		$scope.filterList = function(item){
			if (!item.name.toLowerCase().match($scope.filter.title.toLowerCase())) return false;
			if ($scope.filter.active){
				if ($scope.filter.genre && item.genres.indexOf($scope.filter.genre) == -1) return false;
				if ($scope.filter.watched && item.progress && item.progress.left == 0) return false;
			}
			return true;
		};
		$scope.$emit('ShowsRefresh');
	})
	
	nessa.controller('ShowsMatchController', function($http,$log,$modal,$scope){
		$scope.unmatched = [];
		
		$http.get('/api/shows/unmatched').success(function(json,status){
			$scope.unmatched = json;
		})
		
		
	})
	
	nessa.controller('ShowsRandomController', function($http,$log,$modalInstance,$scope){
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
	})
	
	nessa.controller('ShowsSearchController', function($http, $log, $modalInstance, $rootScope, $scope){
		$scope.loading = false;
		$scope.results = [];
		$scope.selected = null;
		$scope.filter = {
			query: ''
		};
		
		$scope.dismiss = function(){
			$modalInstance.dismiss();
		};
		$scope.reset = function(){
			$scope.selected = null;
			$scope.results = null;
			$scope.filter.query = '';
		};
		$scope.save = function(){
			$http.post('/api/shows', {tvdb: $scope.selected}).success(function(json, status){
				$rootScope.$broadcast('ShowsRefresh', $scope.selected);
				$modalInstance.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.search = function(){
			$scope.loading = true;
			$scope.results = null;
			$http.post('/api/shows/search', {q: $scope.filter.query}).success(function(results, status){
				$scope.loading = false;
				$scope.results = results;
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.select = function(tvdb) {
			$scope.selected = tvdb;
		};
	})

	nessa.controller('ShowController', function($http,$log,$scope){
		$scope.progress = function(){
			$http.get('/api/shows/'+parseInt($scope.show.tvdb)+'/progress').success(function(json, status){
				$scope.show.progress = json;
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
	})
	
	nessa.controller('ShowDetailController', function($http,$log,$modalInstance,$scope,$stateParams){
		var tvdb = parseInt($stateParams.tvdb,10);
		
		$scope.$on('ShowReload', function(e){
			$http.get('/api/shows/'+tvdb).success(function(json, status){
				if (status == 200 && json) $scope.show = json;
				$scope.season = $scope.show.episodes[1];
			}).error(function(json, status){
				$scope.dismiss();
			});
		});
		
		$scope.season = {};
		
		$scope.close = function(){
			$scope.$emit('ShowsRefresh');
			$modalInstance.close();
		};
		$scope.dismiss = function(){
			$modalInstance.dismiss();
		};
		$scope.downloadAll = function(){
			if (confirm('Are you sure you want to download all available episodes?')) {
				$http.post('/api/shows/'+tvdb+'/download').success(function(){
					$scope.$emit('ShowReload');
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.rescan = function(){
			$http.post('/api/shows/'+tvdb+'/scan').success(function(json, status){
			//	$rootScope.$broadcast('alert', {title: $scope.show.name, message: 'Rescan in progress...'});
				
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				$http.delete('/api/shows/'+tvdb).success(function(){
				//	$scope.$emit('alert', {'title':$scope.show.name,'message':'Show removed'});
					$scope.$emit('ShowsRefresh');
					$scope.close();
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.save = function(){
			$http.post('/api/shows/'+tvdb, $scope.show).success(function(json, status){
			//	$scope.$emit('alert', {title: $scope.show.name, message: 'Changes saved'});
			//	$scope.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.update = function(){
			$http.post('/api/shows/'+tvdb+'/update').success(function(json, status){	
			//	$rootScope.$broadcast('alert', {'title':$scope.show.name, message: 'Updating listings...'});
			//	$scope.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.watched = function(){
			var payload = {'tvdb':tvdb};
			$http.post('/api/shows/'+tvdb+'/watched', payload).success(function(json,status){
				$log.log(json, status);
			});
		};
		$scope.$emit('ShowReload');
	})
	
	nessa.controller('ShowEpisodeController', function($http,$log,$scope){
		$scope.download = function(){
			var payload = {
				'season': $scope.episode.season,
				'episode': $scope.episode.episode
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/download', payload);
		};
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var payload = {
				'tvdb': $scope.episode.tvdb,
				'season': $scope.episode.season,
				'episode': $scope.episode.episode,
				'watched': $scope.episode.watched
			};
			$http.post('/api/shows/'+$scope.episode.tvdb+'/watched', payload);
		};
		
		$scope.canDownload = function(){
			if ($scope.episode.hash || $scope.episode.hashes){
				if ($scope.episode.downloading || $scope.episode.file) return false;
				return true;
			}
			return false;
		};
		$scope.hasAired = function(){
			if ($scope.episode.file) return true;
			
			var airdate = new Date($scope.episode.airdate).getTime();
			if (airdate != 0 && airdate < Date.now()) return true;
			
			return false;
		};
		$scope.hasDate = function(){
			var airdate = new Date($scope.episode.airdate).getTime();
			if (airdate > 0) return true;
			return false;
		};
	})
	
	
	
	
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
	
	return nessa;
});