const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

module.exports = {
  frontEndPrefix: {
    options: {
      processors: [autoprefixer({ browsers: "last 2 versions" })]
    },
    src: gruntConfig.frontEnd.build.css
  },
  frontEndMin: {
    options: {
      processors: [cssnano()]
    },
    src: gruntConfig.frontEnd.build.css
  },
  learnFrontEndPrefix: {
    options: {
      processors: [autoprefixer({ browsers: "last 2 versions" })]
    },
    src: gruntConfig.learnFrontEnd.build.css
  }
};
