const path = require("path");

module.exports = {
  frontEndHtml: {
    options: {
      prefixPath: gruntConfig.helpers.prefixPath
    },
    files: [
      {
        src: [`${gruntConfig.frontEnd.src.html}/**/*.ejs`],
        filter: "isFile",
        dest: gruntConfig.frontEnd.build.dir,
        expand: true,
        rename(_dest, src) {
          return path.join(
            _dest,
            `${path
              .relative(gruntConfig.frontEnd.src.html, src)
              .replace(/\.ejs$/i, "")}.html`
          );
        }
      }
    ]
  },
  learnFrontEndHtml: {
    options: {
      prefixPath: gruntConfig.helpers.prefixPath
    },
    files: [
      {
        src: [`${gruntConfig.learnFrontEnd.src.html}/**/*.ejs`],
        filter: "isFile",
        dest: gruntConfig.learnFrontEnd.build.dir,
        expand: true,
        rename(_dest, src) {
          return path.join(
            _dest,
            `${path
              .relative(gruntConfig.learnFrontEnd.src.html, src)
              .replace(/\.ejs$/i, "")}.html`
          );
        }
      }
    ]
  }
};
