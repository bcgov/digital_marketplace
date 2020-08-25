const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

module.exports = {
  prefix: {
    options: {
      processors: [
        autoprefixer({ browsers: "last 2 versions" })
      ]
    },
    src: gruntConfig.frontEnd.build.css
  },
  min: {
    options: {
      processors: [
        cssnano()
      ]
    },
    src: gruntConfig.frontEnd.build.css
  }
};
