const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

module.exports = {
  prefix: {
    options: {
      processors: [
        autoprefixer({ browsers: "last 2 versions" })
      ]
    },
    src: gruntConfig.out.css
  },
  min: {
    options: {
      processors: [
        cssnano()
      ]
    },
    src: gruntConfig.out.css
  }
};
