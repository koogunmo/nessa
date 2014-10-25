define(['app'], function(nessa){
	
	nessa.config(function($stateProvider){
		$stateProvider.state('movies', {
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
			url: ''
		})
		.state('movies.add', {
			url: '/add'
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
	});
	
	/****** Controller ******/
	
	nessa.controller('MovieListCtrl', function($http, $rootScope, $scope){
		$scope.settings	= {};
		$scope.movies	= [];
		
		$scope.filter	= {
			string: {
				title: ''
			}
		};
		
		$scope.clearFilter = function(){
			$scope.filter.string.name = '';
			$(document).trigger('lazyload');
		};
		$scope.definiteArticle = function(movie){
			return [movie.title.replace(/^The\s/i, ''), movie.year];
		};
		
		$http.get('/api/system/settings').success(function(json,status){
			$rootScope.settings = json.media;
			$scope.settings = json.media;
		});
		
		$http.get('/api/movies').success(function(json, status){
			
		//	console.log(json, status);
			
			if (status == 200 && json) {
				$scope.movies = json;
				$(document).trigger('lazyload');
			}
		}).error(function(json, status){
			console.error(json, status);
		});
		
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
	
	
	return nessa;
})