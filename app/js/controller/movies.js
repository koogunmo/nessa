define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider
			.state('movies', {
				'url': '/movies',
				'abstract': true,
				'templateUrl': 'views/movies/index.html',
				'data': {
					'secure': true,
					'title': 'Movies'
				}
			})
			.state('movies.match', {
				'url': '/match',
				'controller': 'MoviesMatchingController',
				'templateUrl': 'views/movies/match.html',
				'data': {
					'secure': true,
					'title': 'Unmatched movies'
				}
			})
			.state('movies.index', {
				'url': '',
				'controller': 'MoviesController',
				'templateUrl': 'views/movies/grid.html',
				'data': {
					'secure': true,
					'title': 'Movies'
				}
			})
			.state('movies.index.detail', {
				'url': '/:imdb/:url',
				'onEnter': function($log,$modal,$state,$stateParams){
					$modal.open({
						'backdrop': true,
						'controller': 'MovieDetailController',
						'templateUrl': 'views/movies/modal/detail.html',
						'windowClass': 'modal-media'
					}).result.then(function(result){
						$state.transitionTo('movies.index');
						window.modal = null;
					}, function(result){
						$state.transitionTo('movies.index');
						window.modal = null;
					});
				},
				'onExit': function(){
					if (window.modal) window.modal.dismiss()
					window.modal = null;
				}
			});
	})
	
	.run(function($log,$rootScope){
		$log.info('Module loaded: Movies');
		$rootScope.menu.push({
			'path': 'movies.index',
			'name': 'Movies',
			'icon': 'film',
			'order': 30
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
	})
	
	
	/******************************** Controllers ********************************/
	
	nessa.controller('MoviesController', function($http,$log,$modal,$scope){
		$scope.filter	= {
			active: false,
			downloaded: true,
			genre: '',
			magnets: false,
			quality: '',
			title: ''
		};
		$scope.movies = [];
		$scope.paginate = {
			items: 24,
			page: 1
		};
		$scope.settings = {};
		
		$scope.addMovie = function(){
			$modal.open({
				'backdrop': 'static',
				'controller': 'MoviesSearchController',
				'templateUrl': 'views/movies/modal/search.html'
			}).result.then(function(resolve){
				$scope.$emit('MoviesRefresh');
			});
		};
		
		$scope.clearFilter = function(){
			$scope.filter.title = '';
			$(document).trigger('lazyload');
		};
		$scope.definiteArticle = function(movie){
			var title = movie.title.split(':')[0].replace(/^The\s/i, '').replace(/\W/, '');
			return [title, movie.year];
		};
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
		$scope.pageNext = function(){
			var pages = Math.ceil($scope.results.length/$scope.paginate.items);
			if ($scope.paginate.page == pages) return;
			$scope.paginate.page++;
		};
		$scope.pagePrev = function(){
			if ($scope.paginate.page == 1) return;
			$scope.paginate.page--;
		};
		
		$scope.$on('MoviesRefresh', function(){
			$http.get('/api/movies').success(function(json, status){
				if (status == 200 && json) {
					$scope.movies = json;
					$(document).trigger('lazyload');
				}
			}).error(function(json, status){
				$log.error(json, status);
			});
		});
		$http.get('/api/system/settings').success(function(json,status){
			$scope.settings = json.media;
		});
		$scope.$watch('filter', function(){
			if ($scope.filter.title != '') $scope.paginate.page = 1;
		},true);
		
		$scope.$emit('MoviesRefresh');
	})
	
	nessa.controller('MoviesSearchController', function($http,$log,$modalInstance,$scope){
		$scope.filter = {
			query: ''
		};
		$scope.loading = false;
		$scope.results = [];
		$scope.selected = null;
		
		$scope.dismiss = function(){
			$modalInstance.dismiss();
		};
		$scope.reset = function(){
			$scope.filter.query = '';
			$scope.results = [];
		}
		$scope.save = function(){
			$http.post('/api/movies',{'imdb':$scope.selected}).success(function(json){
				$modalInstance.close();
				$scope.$emit('MoviesRefresh', true);
			});
		};
		$scope.search = function(){
			$scope.loading = true;
			$scope.results = null;
			
			$http.post('/api/movies/search', {'q':$scope.filter.query}).success(function(results){
				$scope.loading = false;
				$scope.results = results
			}).error(function(error){
				$scope.loading = false;
				$log.error(error);
			});
		};
		$scope.select = function(imdb){
			$scope.selected = imdb;
		};
	});
	
	nessa.controller('MovieDetailController', function($http,$log,$modalInstance,$scope,$stateParams){
		$scope.movie = {};
		$http.get('/api/movies/'+$stateParams.imdb).success(function(movie){
			$scope.movie = movie;
		});
		
		$scope.artwork = function(){
			$http.post('/api/movies/'+$scope.movie.imdb+'/artwork');
		};
		
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.download = function(object){
			$scope.movie.downloading = object.quality;
			$http.post('/api/movies/'+$scope.movie.imdb+'/download', object)
		};
		$scope.hashes = function(){
			$http.get('/api/movies/'+$scope.movie.imdb+'/hashes').success(function(success){
				$scope.movie.hashes = success;
			});
		};
	})
	
	
		
	nessa.controller('MoviesMatchingController', function($http,$log,$modal,$scope){
		$scope.paginate = {
			items: 1,
			page: 1
		};
		$scope.unmatched = [];
		
		$http.get('/api/movies/unmatched').success(function(json,status){
			$scope.unmatched = json;
		});
		
		$scope.$on('MovieMatched', function(e,item){
			var idx = $scope.unmatched.indexOf(item);
		//	$scope.unmatched.splice(idx,1);
		});
	})
	
	nessa.controller('MoviesUnmatchedController', function($http,$log,$scope){
		$scope.matched = false;
		$scope.selected = null;
		$scope.$on('MatchSelected', function(e,match){
			$scope.selected = match;
		});
		
		$scope.match = function(){
			$http.post('/api/movies/match', [{'imdb':$scope.selected.ids.imdb,'file':$scope.movie.file}]).success(function(){
				$scope.$emit('MovieMatched', $scope.movie);
			});
		};
	})
	
	nessa.controller('MoviesMatchOptionController', function($http,$log,$scope){
		$scope.select = function(){
			$scope.$emit('MatchSelected', $scope.match);
		};
	})
	
	
	
	nessa.controller('MovieDetailCtrl', function($http,$log,$modalInstance,$scope,$stateParams){
		$scope.movie = null
		$http.get('/api/movies/'+$stateParams.imdb).success(function(success){
			$scope.movie = success;
		});
		$scope.close = function(){
			$modalInstance.dismiss();
		};
		$scope.download = function(object){
			$scope.movie.downloading = object.quality;
			$http.post('/api/movies/'+$scope.movie.imdb+'/download', object).success(function(success){
				$modalInstance.close()
			})
		};
		$scope.hashes = function(){
			$http.get('/api/movies/'+$scope.movie.imdb+'/hashes').success(function(success){
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
	
	return nessa;
})