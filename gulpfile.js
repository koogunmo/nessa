var gulp		= require('gulp'),
	minify		= require('gulp-minify-css'),
	ngAnnotate	= require('gulp-ng-annotate'),
	nodemon		= require('gulp-nodemon'),
	rename		= require('gulp-rename'),
	sass		= require('gulp-sass'),
	uglify		= require('gulp-uglify');
	
gulp.task('default', ['sass','nodemon']);

gulp.task('nodemon', function(){
	nodemon({'script': 'server.js','ignore':['app/*']});
});

gulp.task('sass', function(){
	var watcher = gulp.watch('./app/css/scss/*.scss', ['sass']);
	
	return gulp.src('./app/css/scss/*.scss')
	.pipe(sass({errLogToConsole: true}))
	.pipe(minify())
	.pipe(rename({suffix: '.min'}))
	.pipe(gulp.dest('./app/css'));
});

gulp.task('uglify', function(){
	return gulp.src('./app/js/controller/*.js')
	.pipe(ngAnnotate())
	.pipe(uglify())
	.pipe(rename({suffix: '.min'}))
	.pipe(gulp.dest('./app/js/controller'));
});

