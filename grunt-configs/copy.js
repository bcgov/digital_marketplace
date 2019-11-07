module.exports = {
  "static": {
    expand: true,
    cwd: gruntConfig.src.static,
    src: "**",
    dest: gruntConfig.dir.build
  }
};
