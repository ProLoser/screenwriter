var gulp = require('gulp'),
    sass = require('gulp-sass')(require('sass')),
    plumber = require('gulp-plumber'),
    webserver = require('gulp-webserver');

// Sass compilation task
function compileSass() {
	return gulp.src('*.scss')
		.pipe(plumber())
		.pipe(sass({
			sourceComments: 'map'
		}))
		.pipe(gulp.dest('.'));
}

// Watch files for changes
function watchFiles() {
	gulp.watch('*.scss', compileSass);
}

// Web server task
function serve() {
	return gulp.src(['**/*.js', '**/*.css', '**/*.html'])
		.pipe(webserver({
			livereload: true,
			open: true,
			fallback: 'index.html'
		}));
}

// Export tasks
exports.sass = compileSass;
exports.watch = watchFiles;
exports.serve = serve;
exports.default = gulp.parallel(serve, watchFiles);