const pathmodify = require("pathmodify");
const envify = require("envify/custom");

module.exports = {
  frontEnd: {
    options: {
      transform: [
        [
          "babelify",
          {
            presets: ["@babel/preset-env", "@babel/preset-react"],
            plugins: ["@babel/plugin-transform-class-properties"],
            global: true,
            // ignore: [/node_modules\/(?!@copilotkit|react-markdown|remark-gfm|remark-math)/], // Temporarily remove ignore
            sourceMaps: gruntConfig.frontEnd.env.NODE_ENV === "development"
          }
        ],
        [envify(gruntConfig.frontEnd.env)]
      ],
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
              ),
              pathmodify.mod.id(
                "devlop",
                "/mnt/c/Users/KMANDRYK/dev/digital_marketplace/node_modules/devlop/lib/development.js"
              ),
              pathmodify.mod.id(
                "#minurl",
                "/mnt/c/Users/KMANDRYK/dev/digital_marketplace/node_modules/vfile/lib/minurl.browser.js"
              ),
              pathmodify.mod.id(
                "#minproc",
                "/mnt/c/Users/KMANDRYK/dev/digital_marketplace/node_modules/vfile/lib/minproc.browser.js"
              ),
              pathmodify.mod.id(
                "#minpath",
                "/mnt/c/Users/KMANDRYK/dev/digital_marketplace/node_modules/vfile/lib/minpath.browser.js"
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
