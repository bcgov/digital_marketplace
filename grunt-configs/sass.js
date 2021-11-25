const SassString = require('sass').types.String;

module.exports = {
  options: {
    implementation: require("sass"),
    sourceMap: false,
    functions: {
      'prefix-path($path)': path => new SassString(gruntConfig.helpers.prefixPath(path.getValue()))
    }
  },
  dist: {
    files: {
      [gruntConfig.frontEnd.build.css]: `${gruntConfig.frontEnd.src.sass}/index.scss`
    }
  }
};
