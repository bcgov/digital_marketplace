/* eslint @typescript-eslint/no-require-imports: "off" */

const path = require("path");
//set up global constants and helpers for all grunt tasks
const deslash = (s) => s.replace(/^\/*/, "").replace(/\/*$/, "");
const prefix = (a) => (b) => `/${a ? deslash(a) + "/" : ""}${deslash(b)}`;
const VITE_NODE_ENV =
  process.env.VITE_NODE_ENV === "development" ? "development" : "production";
const CONTACT_EMAIL =
  process.env.CONTACT_EMAIL || "digitalmarketplace@gov.bc.ca";
const VITE_PATH_PREFIX = process.env.VITE_PATH_PREFIX || "";
const VITE_SHOW_TEST_INDICATOR = process.env.VITE_SHOW_TEST_INDICATOR || "";
const srcFrontEnd = path.resolve(__dirname, "./src/front-end");
const srcBackEnd = path.resolve(__dirname, "./src/back-end");
const srcScripts = path.resolve(__dirname, "./src/scripts");
const srcShared = path.resolve(__dirname, "./src/shared");
const srcLearnFrontEnd = path.resolve(__dirname, "./docs/learn/front-end");
const buildFrontEnd = path.resolve(__dirname, "./build/front-end");
const buildBackEnd = path.resolve(__dirname, "./build/back-end");
const buildScripts = path.resolve(__dirname, "./build/scripts");
const buildLearnFrontEnd = path.resolve(__dirname, "./build/learn-front-end");
const tmpLearnFrontEnd = path.resolve(__dirname, "./tmp/grunt/learn-front-end");
global.gruntConfig = {
  helpers: {
    prefixPath: prefix(VITE_PATH_PREFIX)
  },
  frontEnd: {
    src: {
      dir: srcFrontEnd,
      static: `${srcFrontEnd}/static`,
      html: `${srcFrontEnd}/html`,
      sass: `${srcFrontEnd}/sass`,
      ts: `${srcFrontEnd}/typescript`
    },
    build: {
      dir: buildFrontEnd,
      css: `${buildFrontEnd}/app.css`,
      js: `${buildFrontEnd}/app.js`
    },
    env: {
      VITE_NODE_ENV,
      CONTACT_EMAIL,
      VITE_PATH_PREFIX,
      VITE_SHOW_TEST_INDICATOR
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
  scripts: {
    src: {
      dir: srcScripts
    },
    build: {
      dir: buildScripts
    }
  },
  shared: {
    src: {
      dir: srcShared
    }
  },
  learnFrontEnd: {
    src: {
      dir: srcLearnFrontEnd,
      static: `${srcLearnFrontEnd}/static`,
      html: `${srcLearnFrontEnd}/html`,
      sass: `${srcLearnFrontEnd}/sass`,
      ts: `${srcLearnFrontEnd}/typescript`
    },
    build: {
      dir: buildLearnFrontEnd,
      css: `${buildLearnFrontEnd}/app.css`,
      js: `${buildLearnFrontEnd}/app.js`
    },
    tmp: {
      dir: tmpLearnFrontEnd
    },
    env: {}
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
  grunt.config.init(
    _.mapValues(gruntConfigs, (v) => {
      return _.isFunction(v) ? v(grunt) : v;
    })
  );
  //create task lists for dev and prod envs
  //front-end
  grunt.registerTask("front-end-build-production", [
    "shell:frontEndViteBuildProd"
  ]);
  grunt.registerTask("front-end-build", [`front-end-build-${VITE_NODE_ENV}`]);
  grunt.registerTask("front-end-watch-development", [
    "shell:frontEndViteWatch"
  ]);
  //back-end
  grunt.registerTask("back-end-build-production", [
    "clean:backEndBuild",
    "shell:backEndTypeScript"
  ]);
  grunt.registerTask("back-end-build-development", ["shell:backEndTypeScript"]);
  grunt.registerTask("back-end-build", [`back-end-build-${VITE_NODE_ENV}`]);
  //scripts
  grunt.registerTask("scripts-build-production", [
    "clean:scriptsBuild",
    "shell:scriptsTypeScript"
  ]);
  grunt.registerTask("scripts-build-development", ["shell:scriptsTypeScript"]);
  grunt.registerTask("scripts-build", [`scripts-build-${VITE_NODE_ENV}`]);
  //learn-front-end
  grunt.registerTask("learn-front-end-build", [
    "clean:learnFrontEndTmp",
    "clean:learnFrontEndBuild",
    "copy:learnFrontEndStatic",
    "ejs:learnFrontEndHtml",
    "sass:learnFrontEndCss",
    "postcss:learnFrontEndPrefix",
    "shell:learnFrontEndTypeScript",
    "browserify:learnFrontEnd"
  ]);
  grunt.registerTask("learn-front-end-watch", [
    "learn-front-end-build",
    "concurrent:learnFrontEndWatch"
  ]);
  grunt.registerTask("learn-front-end-serve", ["shell:learnFrontEndServe"]);
};
