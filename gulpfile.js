var gulp = require('gulp'),
    less = require('gulp-sass'),
    livereload = require('gulp-livereload'),
    watch = require('gulp-watch');

gulp.task('default', function() {
  gulp.src('*.js, *.css, *.html')
    .pipe(watch())
    .pipe(livereload());
});