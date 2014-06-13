var gulp = require('gulp'),
	minify = require('gulp-minify-css'),
	nodemon = require('gulp-nodemon'),
	rename = require('gulp-rename'),
	sass = require('gulp-sass');
	
var watcher = gulp.watch('./app/assets/css/scss/*.scss', ['sass']);

gulp.task('default', ['sass','nodemon']);

gulp.task('nodemon', function(){
	nodemon({script: 'server.js'});
});

gulp.task('sass', function(){
	gulp.src('./app/assets/css/scss/*.scss').pipe(sass()).pipe(minify()).pipe(rename({suffix: '.min'})).pipe(gulp.dest('./app/assets/css'));
});

