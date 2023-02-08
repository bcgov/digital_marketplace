const { transform, assign } = require("lodash");
const path = require("path");
const pathmodify = require("pathmodify");
const envify = require("envify/custom");

module.exports = {
  frontEnd: {
    options: {
      transform: [[envify(gruntConfig.frontEnd.env)]],
      plugin: [
        [
          "pathmodify",
          {
            mods: [
              pathmodify.mod.dir(
                "front-end",
                `${gruntConfig.frontEnd.tmp.dir}/front-end/typescript`
              ),
              pathmodify.mod.dir(
                "shared",
                `${gruntConfig.frontEnd.tmp.dir}/shared`
              )
            ]
          }
        ]
      ],
      browserifyOptions: {
        debug: gruntConfig.frontEnd.env.NODE_ENV === "development",
        paths: ["./node_modules"]
      }
    },
    src: [`${gruntConfig.frontEnd.tmp.dir}/front-end/typescript/index.js`],
    dest: gruntConfig.frontEnd.build.js
  },
  learnFrontEnd: {
    options: {
      transform: [[envify(gruntConfig.learnFrontEnd.env)]],
      plugin: [
        [
          "pathmodify",
          {
            mods: [
              pathmodify.mod.dir(
                "learn-front-end",
                `${gruntConfig.learnFrontEnd.tmp.dir}/docs/learn/front-end/typescript`
              ),
              pathmodify.mod.dir(
                "front-end",
                `${gruntConfig.learnFrontEnd.tmp.dir}/src/front-end/typescript`
              ),
              pathmodify.mod.dir(
                "shared",
                `${gruntConfig.learnFrontEnd.tmp.dir}/src/shared`
              )
            ]
          }
        ]
      ],
      browserifyOptions: {
        debug: true,
        paths: ["./node_modules"]
      }
    },
    src: [
      `${gruntConfig.learnFrontEnd.tmp.dir}/docs/learn/front-end/typescript/index.js`
    ],
    dest: gruntConfig.learnFrontEnd.build.js
  }
};
