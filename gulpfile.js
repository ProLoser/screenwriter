var gulp = require('gulp'),
    sass = require('gulp-sass'),
    plumber = require('gulp-plumber'),
    react = require('gulp-react'),
    webserver = require('gulp-webserver');
var browserify = require('gulp-browserify');
// var concat = require('gulp-concat');

gulp.task('default', function() {
	gulp.src(['**/*.js', '**/*.css', '**/*.html'])
		.pipe(webserver({
			livereload: true,
			open: true,
			fallback: 'index.html'
		}));
	gulp.watch('*.scss', ['sass']);
	gulp.watch('*.jsx', ['react']);
});
gulp.task('sass', function() {
	gulp.src('*.scss')
		.pipe(plumber())
		.pipe(sass({
			sourceComments: 'map'
		}))
		.pipe(gulp.dest('.'));
});
gulp.task('react', function() {
	gulp.src('*.jsx')
		.pipe(plumber())
		.pipe(react())
		.pipe(gulp.dest('.'));
});

gulp.task('browserify', function() {
    gulp.src('*.jsx')
      .pipe(browserify({transform: 'reactify'}))
      .pipe(concat('script.js'))
      .pipe(gulp.dest('.'));
});