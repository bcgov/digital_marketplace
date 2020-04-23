const path = require("path");

module.exports = {
  html: {
    options: {
      prefixPath: gruntConfig.helpers.prefixPath
    },
    files: [{
      src: [ `${gruntConfig.src.html}/**/*.ejs` ],
      filter: "isFile",
      dest: gruntConfig.dir.build,
      expand: true,
      rename(_dest, src) {
        return path.join(_dest, `${path.relative(gruntConfig.src.html, src).replace(/\.ejs$/i, '')}.html`);
      }
    }]
  }
};
