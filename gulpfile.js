var gulp = require('gulp'),
    sass = require('gulp-sass'),
    webserver = require('gulp-webserver');

gulp.task('default', function() {
	gulp.src('.')
		.pipe(webserver({
			livereload: true,
			open: true,
			fallback: 'index.html'
		}));
	gulp.watch('*.scss', ['sass']);
});
gulp.task('sass', function() {
	gulp.src('*.scss')
		.pipe(sass({
			sourceComments: 'map'
		}))
		.pipe(gulp.dest('.'));
});