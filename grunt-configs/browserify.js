const { transform, assign } = require("lodash");
const path = require("path");
const root = path.resolve(__dirname, "..", gruntConfig.src.ts);
const compilerOptions = require(path.join(root, "tsconfig.json")).compilerOptions;
const pathmodify = require("pathmodify");

module.exports = {
  build: {
    options: {
      transform: [
        [
          "envify",
          gruntConfig.env
        ]
      ],
      plugin: [
        [
          "pathmodify",
          {
            mods: [
              pathmodify.mod.dir("front-end", `${gruntConfig.tmp.frontEnd}`),
              pathmodify.mod.dir("shared", `${gruntConfig.tmp.shared}`)
            ]
          }
        ]
      ],
      browserifyOptions: {
        debug: gruntConfig.env.NODE_ENV === "development",
        paths: ['./node_modules']
      }
    },
    src: [
      `${gruntConfig.tmp.frontEnd}/index.js`
    ],
    dest: `${gruntConfig.out.js}`
  }
};
