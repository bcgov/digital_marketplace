const path = require("path");
//set up global constants for all grunt tasks
const env = process.env.NODE_ENV || "development";
const src = path.resolve(__dirname, "./src/front-end");
const tmp = path.resolve(__dirname, "./tmp/grunt");
const build = path.resolve(__dirname, "./build/front-end");
global.gruntConfig = {
  dir: {
    src,
    tmp,
    build
  },
  src: {
    "static": `${src}/static`,
    sass: `${src}/sass`,
    ts: `${src}/typescript`,
    tsShared: `src/shared`
  },
  tmp: {
    js: `${tmp}/js`,
    frontEnd: `${tmp}/js/front-end/typescript`,
    shared: `${tmp}/js/shared`
  },
  out: {
    css: `${build}/app.css`,
    js: `${build}/app.js`,
    html: `${build}/`
  }
};

//dependencies
const loadTasks = require("load-grunt-tasks");
const requireDir = require("require-dir");
const _ = require("lodash");
const gruntConfigs = requireDir("./grunt-configs");

module.exports = function (grunt) {
  //load grunt tasks from package.json
  loadTasks(grunt);
  //initialize the grunt configs for various loaded tasks
  grunt.config.init(_.mapValues(gruntConfigs, v => {
    return _.isFunction(v) ? v(grunt) : v;
  }));
  //create task lists for dev and prod envs
  grunt.registerTask("common", [
    "clean",
    "copy",
    "sass",
    "postcss:prefix",
    "shell:typescript",
    "browserify",
  ]);
  grunt.registerTask("development-build", [
    "common",
    "compress"
  ]);
  grunt.registerTask("development-watch", [
    "development-build",
    "watch"
  ]);
  grunt.registerTask("production-build", [
    "common",
    "postcss:min",
    "terser:production",
    "htmlmin:production",
    "compress"
  ]);
  grunt.registerTask("build", [ `${env}-build` ]);
  grunt.registerTask("default", [ "development-watch" ]);
};
