module.exports = {
  frontEndStatic: {
    expand: true,
    cwd: gruntConfig.frontEnd.src.static,
    src: "**",
    dest: gruntConfig.frontEnd.build.dir
  },
  learnFrontEndStatic: {
    expand: true,
    cwd: gruntConfig.learnFrontEnd.src.static,
    src: "**",
    dest: gruntConfig.learnFrontEnd.build.dir
  }
};
