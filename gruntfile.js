const path = require("path");
//set up global constants and helpers for all grunt tasks
const deslash = s => s.replace(/^\/*/, '').replace(/\/*$/, '');
const prefix = a => b => `/${a ? deslash(a) + '/' : ''}${deslash(b)}`;
const NODE_ENV = process.env.NODE_ENV === "development" ? "development" : "production";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "digitalmarketplace@gov.bc.ca";
const PATH_PREFIX = process.env.PATH_PREFIX || "";
const src = path.resolve(__dirname, "./src/front-end");
const tmp = path.resolve(__dirname, "./tmp/grunt");
const build = path.resolve(__dirname, "./build/front-end");
global.gruntConfig = {
  env: {
    NODE_ENV,
    CONTACT_EMAIL
  },
  helpers: {
    prefixPath: prefix(PATH_PREFIX)
  },
  dir: {
    src,
    tmp,
    build
  },
  src: {
    "static": `${src}/static`,
    "html": `${src}/html`,
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
    js: `${build}/app.js`
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
    "ejs",
    "sass",
    "postcss:prefix",
    "shell:typescript",
    "browserify",
  ]);
  grunt.registerTask("development-build", [
    "common",
    "compress:gzip"
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
    "compress:gzip",
    "compress:brotli"
  ]);
  grunt.registerTask("build", [ `${NODE_ENV}-build` ]);
  grunt.registerTask("default", [ "development-watch" ]);
};
