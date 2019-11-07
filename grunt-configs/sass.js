module.exports = {
  options: {
    implementation: require("node-sass"),
    sourceMap: false
  },
  dist: {
    files: {
      [gruntConfig.out.css]: `${gruntConfig.src.sass}/index.scss`
    }
  }
};
