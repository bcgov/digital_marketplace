const sass = require("sass");

module.exports = {
  options: {
    implementation: sass,
    sourceMap: false,
    functions: {
      "prefix-path($path)": (path) =>
        new sass.types.String(gruntConfig.helpers.prefixPath(path.getValue()))
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
