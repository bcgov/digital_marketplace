const path = require("path");

const deslash = s => s.replace(/^\/*/, '').replace(/\/*$/, '');
const prefix = a => b => `/${a ? deslash(a) + '/' : ''}${deslash(b)}`;

const options = {
  prefixPath: prefix(process.env.PATH_PREFIX || "")
};

module.exports = {
  html: {
    options,
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
