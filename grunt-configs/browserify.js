const { transform, assign } = require("lodash");
const path = require("path");
const root = path.resolve(__dirname, "..", gruntConfig.src.ts);
const compilerOptions = require(path.join(root, "tsconfig.json")).compilerOptions;
const pathmodify = require("pathmodify");
const isDev = process.env.NODE_ENV === "development";

module.exports = {
  build: {
    options: {
      transform: [
        [
          "envify",
          {
            NODE_ENV: isDev ? "development" : "production",
            CONTACT_EMAIL: process.env.CONTACT_EMAIL
          }
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
        debug: isDev,
        paths: ['./node_modules']
      }
    },
    src: [
      `${gruntConfig.tmp.frontEnd}/index.js`
    ],
    dest: `${gruntConfig.out.js}`
  }
};
