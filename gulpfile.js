var gulp = require('gulp'),
	minify = require('gulp-minify-css'),
	nodemon = require('gulp-nodemon'),
	rename = require('gulp-rename'),
	sass = require('gulp-sass');
	
var watcher = gulp.watch('./app/css/scss/*.scss', ['sass']);

gulp.task('default', ['sass','nodemon']);

gulp.task('nodemon', function(){
	nodemon({script: 'server.js'});
});

gulp.task('sass', function(){
	return gulp.src('./app/css/scss/*.scss')
	.pipe(sass({errLogToConsole: true}))
	.pipe(minify()).pipe(rename({suffix: '.min'}))
	.pipe(gulp.dest('./app/css'));
});

