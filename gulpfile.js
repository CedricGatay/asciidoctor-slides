'use strict';
var pkg = require('./package.json'),
  autoprefixer = require('gulp-autoprefixer'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  chmod = require('gulp-chmod'),
  connect = require('gulp-connect'),
  csso = require('gulp-csso'),
  del = require('del'),
  exec = require('gulp-exec'),
  ghpages = require('gh-pages'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  jade = require('gulp-jade'),
  path = require('path'),
  plumber = require('gulp-plumber'), // plumber prevents pipe breaking caused by errors thrown by plugins
  rename = require('gulp-rename'),
  source = require('vinyl-source-stream'),
  stylus = require('gulp-stylus'),
  through = require('through'),
  uglify = require('gulp-uglify'),
  isDist = process.argv.indexOf('deploy') >= 0,
  MAX_HTML_FILE_SIZE = 100 * 1024 * 1024;

gulp.task('js', ['clean:js'], function() {
  // see https://wehavefaces.net/gulp-browserify-the-gulp-y-way-bb359b3f9623
  return browserify('src/docs/scripts/main.js').bundle()
    // NOTE this error handler fills the role of plumber() when working with browserify
    .on('error', function(e) { if (isDist) { throw e; } else { gutil.log(e.stack); this.emit('end'); } })
    .pipe(source('src/docs/scripts/main.js'))
    .pipe(buffer())
    .pipe(isDist ? uglify() : through())
    .pipe(rename('build.js'))
    .pipe(gulp.dest('public/build'))
    .pipe(connect.reload());
});

gulp.task('html', ['clean:html'], function() {
  return gulp.src('src/docs/asciidoc/index.adoc')
    .pipe(isDist ? through() : plumber())
    .pipe(exec('bundle exec asciidoctor-bespoke -a basedir="'+ __dirname + '" -r asciidoctor-diagram -o - src/docs/asciidoc/index.adoc', { pipeStdout: true, maxBuffer: MAX_HTML_FILE_SIZE }))
    .pipe(exec.reporter({ stdout: false }))
    .pipe(rename('index.html'))
    .pipe(chmod(644))
    .pipe(gulp.dest('public'))
    .pipe(connect.reload());
});

gulp.task('css', ['clean:css'], function() {
  return gulp.src('src/docs/styles/main.styl')
    .pipe(isDist ? through() : plumber())
    .pipe(stylus({ 'include css': true, paths: ['./node_modules'] }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'], cascade: false }))
    .pipe(isDist ? csso() : through())
    .pipe(rename('build.css'))
    .pipe(gulp.dest('public/build'))
    .pipe(connect.reload());
});

gulp.task('fonts', ['clean:fonts'], function() {
  return gulp.src('src/docs/fonts/*')
    .pipe(gulp.dest('public/fonts'))
    .pipe(connect.reload());
});

gulp.task('images', ['clean:images'], function() {
  return gulp.src('src/docs/images/**/*')
    .pipe(gulp.dest('public/images'))
    .pipe(connect.reload());
});

gulp.task('onstage', ['clean:onstage'], function() {
  return gulp.src('node_modules/bespoke-onstage/**/*')
    .pipe(gulp.src('onstage/**'))
    .pipe(gulp.dest('public/onstage'))
    .pipe(connect.reload());
});

gulp.task('clean', function() {
  return del('public');
});

gulp.task('clean:html', function() {
  return del('public/index.html');
});

gulp.task('clean:js', function() {
  return del('public/build/build.js');
});

gulp.task('clean:css', function() {
  return del('public/build/build.css');
});

gulp.task('clean:fonts', function() {
  return del('public/fonts');
});

gulp.task('clean:images', function() {
  return del('public/images');
});

gulp.task('clean:onstage', function() {
  return del('public/onstage');
});

gulp.task('connect', ['build'], function() {
  connect.server({ root: 'public', port: 8000, livereload: true });
});

gulp.task('watch', function() {
  gulp.watch('src/docs/**/*.adoc', ['html']);
  gulp.watch('src/docs/scripts/**/*.js', ['js']);
  gulp.watch('src/docs/styles/**/*.styl', ['css']);
  gulp.watch('src/docs/images/**/*', ['images']);
  gulp.watch('node_modules/bespoke-onstage/**/*', ['onstage']);
  gulp.watch('src/docs/fonts/*', ['fonts']);
});

gulp.task('deploy', ['clean', 'build'], function(done) {
  ghpages.publish(path.join(__dirname, 'public'), { logger: gutil.log, remote: 'github' }, done);
});

gulp.task('build', ['js', 'html', 'css', 'fonts', 'images', 'onstage']);
gulp.task('serve', ['connect', 'watch']);
gulp.task('default', ['build']);
