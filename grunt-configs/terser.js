module.exports = {
  production: {
    options: {
      output: {
        comments: false
      }
    },
    files: {
      [gruntConfig.out.js]: [gruntConfig.out.js]
    }
  }
};
