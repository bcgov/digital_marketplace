module.exports = {
  production: {
    options: {
      output: {
        comments: false
      }
    },
    files: {
      [gruntConfig.frontEnd.build.js]: [gruntConfig.frontEnd.build.js]
    }
  }
};
