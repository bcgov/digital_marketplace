const SassString = require("node-sass").types.String;

module.exports = {
  options: {
    implementation: require("node-sass"),
    sourceMap: false,
    functions: {
      "prefix-path($path)": (path) =>
        new SassString(gruntConfig.helpers.prefixPath(path.getValue()))
    }
  },
  frontEndCss: {
    files: {
      [gruntConfig.frontEnd.build
        .css]: `${gruntConfig.frontEnd.src.sass}/index.scss`
    }
  },
  learnFrontEndCss: {
    files: {
      [gruntConfig.learnFrontEnd.build
        .css]: `${gruntConfig.learnFrontEnd.src.sass}/index.scss`
    }
  }
};
