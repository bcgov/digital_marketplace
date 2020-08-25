const path = require("path");
//set up global constants and helpers for all grunt tasks
const deslash = s => s.replace(/^\/*/, '').replace(/\/*$/, '');
const prefix = a => b => `/${a ? deslash(a) + '/' : ''}${deslash(b)}`;
const NODE_ENV = process.env.NODE_ENV === "development" ? "development" : "production";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "digitalmarketplace@gov.bc.ca";
const PATH_PREFIX = process.env.PATH_PREFIX || "";
const srcFrontEnd = path.resolve(__dirname, "./src/front-end");
const srcBackEnd = path.resolve(__dirname, "./src/back-end");
const srcShared = path.resolve(__dirname, "./src/shared");
const buildFrontEnd = path.resolve(__dirname, "./build/front-end");
const buildBackEnd = path.resolve(__dirname, "./build/back-end");
const tmpFrontEnd = path.resolve(__dirname, "./tmp/grunt/front-end");
const tmpBackEnd = path.resolve(__dirname, "./tmp/grunt/back-end");
const tmpShared = path.resolve(__dirname, "./tmp/grunt/shared");
global.gruntConfig = {
  helpers: {
    prefixPath: prefix(PATH_PREFIX)
  },
  frontEnd: {
    src: {
      dir: srcFrontEnd,
      "static": `${srcFrontEnd}/static`,
      "html": `${srcFrontEnd}/html`,
      sass: `${srcFrontEnd}/sass`,
      ts: `${srcFrontEnd}/typescript`
    },
    build: {
      dir: buildFrontEnd,
      css: `${buildFrontEnd}/app.css`,
      js: `${buildFrontEnd}/app.js`
    },
    tmp: {
      dir: tmpFrontEnd
    },
    env: {
      NODE_ENV,
      CONTACT_EMAIL
    }
  },
  backEnd: {
    src: {
      dir: srcBackEnd
    },
    build: {
      dir: buildBackEnd
    }
  },
  shared: {
    src: {
      dir: srcShared
    }
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
  //front-end
  grunt.registerTask("front-end-common", [
    "clean:frontEndTmp",
    "clean:frontEndBuild",
    "copy",
    "ejs",
    "sass",
    "postcss:prefix",
    "shell:typeScriptFrontEnd",
    "browserify:frontEnd",
  ]);
  grunt.registerTask("front-end-build-development", [
    "front-end-common",
    "compress:gzip"
  ]);
  grunt.registerTask("front-end-build-production", [
    "front-end-common",
    "postcss:min",
    "terser:production",
    "htmlmin:production",
    "compress:gzip",
    "compress:brotli"
  ]);
  grunt.registerTask("front-end-build", [ `front-end-build-${NODE_ENV}` ]);
  grunt.registerTask("front-end-watch-development", [
    "front-end-build-development",
    "watch"
  ]);
  //back-end
  grunt.registerTask("back-end-build", [
    "clean:backEndBuild",
    "shell:typeScriptBackEnd"
  ]);
};
