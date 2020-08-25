module.exports = {
  "static": {
    expand: true,
    cwd: gruntConfig.frontEnd.src.static,
    src: "**",
    dest: gruntConfig.frontEnd.build.dir
  }
};
