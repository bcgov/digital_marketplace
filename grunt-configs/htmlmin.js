const html = gruntConfig.frontEnd.build.dir;
const index = `${html}/index.html`;

module.exports = {
  production: {
    options: {
      removeComments: true,
      collapseWhitespace: true,
      minifyJS: true,
      minifyCSS: true,
      collapseInlineTagWhitespace: true,
      caseSensitive: true,
      conservativeCollapse: true,
      keepClosingSlash: true
    },
    files: {
      [index]: index
    }
  }
};
