define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider
			.state('movies', {
				abstract: true,
				url: '/movies',
				controller: 'MovieListCtrl',
				templateUrl: 'views/section/movies.html',
				data: {
					secure: true,
					title: 'Movies'
				}
			})
			.state('movies.index', {
				url: '',
				onEnter: function($http,$log){
			//		$http.get('/api/movies/scan').success(function(success){
			//			$log.debug(success)
			//		})
				}
			})
			
		.state('movies.add', {
			url: '/add',
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					controller: 'MovieSearchCtrl',
					templateUrl: 'views/modal/movie/search.html'
				}).result.then(function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		})
		
		.state('movies.detail', {
			url: '/info/{id:[0-9]+}',
			onEnter: function($log,$modal,$state,$stateParams){
				$modal.open({
					controller: 'MovieDetailCtrl',
					templateUrl: 'views/modal/movie/detail.html'
				}).result.then(function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		})
		
		.state('movies.match', {
			url: '/match',
			onEnter: function($modal, $state, $stateParams){
				$modal.open({
					controller: 'MovieUnmatchedCtrl',
					templateUrl: 'views/modal/movie/match.html'
				}).result.then(function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				}, function(result){
					$state.transitionTo('movies.index');
					window.modal = null;
				});
			},
			onExit: function(){
				if (window.modal) window.modal.dismiss()
				window.modal = null;
			}
		})
		
	});
	
	nessa.run(function($log, $rootScope){
		$log.info('Module loaded: Movies');
		$rootScope.menu.push({
			path: 'movies.index',
			name: 'Movies',
			icon: 'film',
			order: 30
		});
		$rootScope.genres.movies = [
			'Action','Adventure','Animation',
			'Comedy','Crime','Documentary','Drama',
			'Family','Fantasy','Film Noir',
			'History','Horror','Indie',
			'Music','Musical','Mystery','Romance',
			'Science Fiction','Sport','Suspense',
			'Thriller','War','Western'
		];
		$rootScope.quality = ['480p','720p','1080p'];
	});
	
	/****** Controller ******/
	
	nessa.controller('MovieListCtrl', function($log,$http,$rootScope,$scope){
		$scope.settings	= {};
		$scope.movies	= [];
		$scope.page 	= 1;
		
		$scope.filter	= {
			active: false,
			downloaded: true,
			genre: '',
			magnets: false,
			quality: '',
			title: ''
		};
		$scope.paginate = {
			items: 24,
			page: 1
		};
		
		$scope.$watch('filter', function(){
			if ($scope.filter.title != '') $scope.paginate.page = 1;
		},true);
		
		$scope.filterList = function(item){
			if (!item.title.toLowerCase().match($scope.filter.title.toLowerCase())) return false;
			if ($scope.filter.active){
				if ($scope.filter.genre && item.genres.indexOf($scope.filter.genre) == -1) return false;
				if ($scope.filter.quality && item.quality != $scope.filter.quality) return false;
				if ($scope.filter.magnets && (!item.hashes || item.hashes.length == 0)) return false;
			}
			if ($scope.filter.downloaded && !item.file) return false;
			return true;
		};
		
		$scope.clearFilter = function(){
			$scope.filter.title = '';
			$(document).trigger('lazyload');
		};
		$scope.definiteArticle = function(movie){
			var title = movie.title.split(':')[0].replace(/^The\s/i, '').replace(/\W/, '');
			return [title, movie.year];
		};
		
		$http.get('/api/system/settings').success(function(json,status){
			$rootScope.settings = json.media;
			$scope.settings = json.media;
		});
		
		$http.get('/api/movies').success(function(json, status){
			if (status == 200 && json) {
				$scope.movies = json;
				$(document).trigger('lazyload');
			}
		}).error(function(json, status){
			console.error(json, status);
		});
		
	});
	
	nessa.controller('MovieDetailCtrl', function($http,$log,$modalInstance,$scope,$stateParams){
		$scope.movie = null
		$http.get('/api/movies/'+$stateParams.id).success(function(success){
			$scope.movie = success;
		});
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.download = function(object){
			$scope.movie.downloading = object.quality;
			$http.post('/api/movies/'+$scope.movie.tmdb+'/download', object).success(function(success){
				$modalInstance.close()
			})
		};
		$scope.hashes = function(){
			$http.get('/api/movies/'+$scope.movie.tmdb+'/hashes').success(function(success){
				$scope.movie.hashes = success;
			});
		};
	});
	
	nessa.controller('MovieUnmatchedCtrl', function($http, $log, $modalInstance, $scope){
		window.modal = $modalInstance;
		
		$scope.matched		= {};
		$scope.unmatched	= [];
		
		$scope.dismiss = function(){
			$modalInstance.dismiss();
		}
		$scope.save = function(){
			$http.post('/api/movies/unmatched', $scope.matched).success(function(json){
				$modalInstance.close();
			})
		};
		
		$http.get('/api/movies/unmatched').success(function(json){
			$scope.unmatched = json;
		})
		
	})
	
	nessa.controller('MovieMatchCtrl', function($http,$log,$scope){
		
	});
	
	nessa.controller('MovieSearchCtrl', function($http,$log,$modalInstance,$scope){
		$scope.filter = {
			query: ''
		};
		$scope.results = [];
		$scope.selected = null;
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.reset = function(){
			$scope.filter.query = '';
			$scope.results = [];
		}
		$scope.save = function(){
			$http.post('/api/movies', {tmdb: $scope.selected}).success(function(json){
				$modalInstance.close();
			});
		};
		$scope.search = function(){
			$http.post('/api/movies/search', {q: $scope.filter.query}).success(function(json){
				$scope.results = json
			});
		};
		$scope.select = function(tmdb){
			$scope.selected = tmdb;
		};
	});
	
	return nessa;
})