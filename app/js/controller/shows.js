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
			controller: 'ShowsMatchingController',
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
			url: '/:imdb/:url',
			data: {
				title: 'Show Info'
			},
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					templateUrl: 'views/shows/modal/detail.html',
					controller: 'ShowDetailController',
					backdrop: true,
					windowClass: 'modal-media'
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
	
	nessa.run(function($http,$log,$rootScope){
		$log.info('Module loaded: Shows');
		$rootScope.menu.push({
			path: 'shows.index',
			name: 'Shows',
			icon: 'th',
			order: 20
		});
		$rootScope.genres.shows = [
			{'name':'Action','slug':'action'},
			{'name':'Adventure','slug':'adventure'},
			{'name':'Animation','slug':'animation'},
			{'name':'Comedy','slug':'comedy'},
			{'name':'Crime','slug':'crim'},
			{'name':'Documentary','slug':'documentary'},
			{'name':'Drama','slug':'drama'},
			{'name':'Fantasy','slug':'fantasy'},
			{'name':'Horror','slug':'horror'},
			{'name':'Mystery','slug':'mystery'},
			{'name':'Science Fiction','slug':'science-fiction'},
			{'name':'Sport','slug':'sports'},
			{'name':'Thriller','slug':'thriller'},
			{'name':'War','slug':'war'},
			{'name':'Western','slug':'western'}
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
		
		$scope.pageNext = function(){
			var pages = Math.ceil($scope.results.length/$scope.paginate.items);
			if ($scope.paginate.page == pages) return;
			$scope.paginate.page++;
		};
		$scope.pagePrev = function(){
			if ($scope.paginate.page == 1) return;
			$scope.paginate.page--;
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
	
	nessa.controller('ShowsMatchingController', function($http,$log,$modal,$scope){
		$scope.paginate = {
			items: 1,
			page: 1
		};
		$scope.unmatched = [];
		$http.get('/api/shows/unmatched').success(function(json,status){
			$scope.unmatched = json;
		});
		$scope.$on('ShowMatched', function(e,item){
			var idx = $scope.unmatched.indexOf(item);
			$scope.unmatched.splice(idx,1);
		});
	})
	.controller('ShowsUnmatchedController', function($http,$log,$scope){
		$scope.custom = false;
		$scope.loading = false;
		$scope.matched = false;
		$scope.selected = false;
		$scope.query = null;

		$scope.show.original = angular.copy($scope.show.matches);
		
		$scope.filter = function(){
			$scope.custom = !$scope.custom;
			$scope.selected = false;
			$scope.query = null;
			if ($scope.custom){
				$scope.show.matches = [];
			} else {
				$scope.show.matches = angular.copy($scope.show.original);
			}
		};
		$scope.submit = function(){
			if ($scope.selected){
				$http.post('/api/shows/match', {'imdb':$scope.selected.ids.imdb,'directory':$scope.show.file}).success(function(){
					$scope.$emit('ShowMatched', $scope.show);
				});
			} else {
				$scope.search();
			}
		};
		$scope.reset = function(){
			$scope.query = null;
			$scope.selected = false
			if ($scope.custom) $scope.show.matches = false;
		};
		$scope.search = function(){
			if (!$scope.query) return;
			$scope.show.matches = [];
			$scope.selected = false;
			$scope.loading = true;
			$http.post('/api/shows/search', {'q':$scope.query}).success(function(results){
				$scope.loading = false
				results.forEach(function(result){
					$scope.show.matches.push(result.show);
				});
			}).error(function(){
				$scope.loading = false;
			});
		};
		$scope.$on('MatchSelected', function(e,match){
			$scope.selected = match;
		});
	})
	.controller('ShowsMatchOptionController', function($http,$log,$scope){
		$scope.select = function(){
			$scope.$emit('MatchSelected', $scope.match);
		};
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
			$http.post('/api/shows', {'imdb': $scope.selected}).success(function(json, status){
				$rootScope.$broadcast('ShowsRefresh', $scope.selected);
				$modalInstance.close();
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.search = function(){
			$scope.loading = true;
			$scope.results = null;
			$http.post('/api/shows/search', {'q': $scope.filter.query}).success(function(results, status){
				$scope.loading = false;
				$scope.results = results;
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.select = function(imdb) {
			$scope.selected = imdb;
		};
	})

	nessa.controller('ShowController', function($http,$log,$scope){
		
	})
	
	nessa.controller('ShowDetailController', function($http,$log,$modalInstance,$rootScope,$scope,$stateParams){
		var imdb = $stateParams.imdb;
		
		$scope.$on('ShowReload', function(e){
			$http.get('/api/shows/'+imdb).success(function(json, status){
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
				$http.post('/api/shows/'+$scope.show.imdb+'/download').success(function(){
				//	$scope.$emit('ShowReload');
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.rescan = function(){
			$http.post('/api/shows/'+$scope.show.imdb+'/scan').success(function(json, status){
				$rootScope.$broadcast('alert',{
					'type':'info',
					'title':'Rescanning files',
					'message':$scope.show.name,
					'icon':'/media/'+$scope.settings.media.shows.directory+'/'+$scope.show.directory+'/poster.jpg'
				});
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.remove = function(){
			if (confirm('Are you sure you want to remove this show?')) {
				$http.delete('/api/shows/'+$scope.show.imdb).success(function(){
					$rootScope.$broadcast('alert',{
						'type':'danger',
						'title':'Show removed',
						'message':$scope.show.name,
						'icon':'/media/'+$scope.settings.media.shows.directory+'/'+$scope.show.directory+'/poster.jpg'
					});
					$rootScope.$broadcast('ShowsRefresh');
					$scope.close();
				}).error(function(json, status){
					$log.error(json, status);
				});
			}
		};
		$scope.save = function(){
			var settings = {
				'id': $scope.show._id,
				'feed': $scope.show.feed,
				'format': $scope.show.format,
				'hd': $scope.show.hd,
				'status': $scope.show.status
			};
			$http.post('/api/shows/'+$scope.show.imdb, settings).success(function(json, status){
				$rootScope.$broadcast('alert',{
					'type':'success',
					'title':'Settings saved',
					'message':$scope.show.name,
					'icon':'/media/'+$scope.settings.media.shows.directory+'/'+$scope.show.directory+'/poster.jpg'
				});
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.update = function(){
			$http.post('/api/shows/'+$scope.show.imdb+'/update').success(function(json, status){
				$scope.$emit('ShowReload');
				$rootScope.$broadcast('alert',{
					'type':'info',
					'title':'Updating details',
					'message':$scope.show.name,
					'icon':'/media/'+$scope.settings.media.shows.directory+'/'+$scope.show.directory+'/poster.jpg'
				});
			}).error(function(json, status){
				$log.error(json, status);
			});
		};
		$scope.watched = function(){
			var payload = {'watched':true};
			$http.post('/api/shows/'+$scope.show.imdb+'/watched', payload);
		};
		$scope.$emit('ShowReload');
	})
	
	nessa.controller('ShowSeasonController', function($http,$log,$scope){
		$scope.watched = function(){
			$scope.season.progress.completed = $scope.season.progress.aired;
			$scope.season.progress.left = 0;
			$scope.season.progress.percentage = 100;
			var payload = {
				'season': $scope.season.season,
				'watched': true
			};
		//	$http.post('/api/shows/'+$scope.show.imdb+'/watched', payload);
		};
	})
	
	nessa.controller('ShowEpisodeController', function($http,$log,$scope){
		$scope.download = function(){
			var payload = {
				'season': $scope.episode.season,
				'episode': $scope.episode.episode
			};
			$http.post('/api/shows/'+$scope.show.imdb+'/download', payload);
		};
		$scope.watched = function(){
			$scope.episode.watched = !$scope.episode.watched;
			var payload = {
				'season': $scope.episode.season,
				'episode': $scope.episode.episode,
				'watched': $scope.episode.watched
			};
		//	if (watched) $scope.season.progress.completed += 1;
		//	if (!watched) $scope.season.progress.completed -= 1;
			$http.post('/api/shows/'+$scope.show.imdb+'/watched', payload);
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
			$http.post('/api/shows/match', {'matched': $scope.matched}).success(function(json,status){
				$scope.close();
			});
		};
		$scope.set = function(id, imdb){
			$scope.matched[id] = {'id':id,'imdb':imdb};
		};
	});
	
	return nessa;
});