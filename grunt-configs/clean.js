module.exports = {
  frontEndTmp: [
    `${gruntConfig.frontEnd.tmp.dir}/*`
  ],
  frontEndBuild: [
    `${gruntConfig.frontEnd.build.dir}/*`
  ],
  backEndBuild: [
    `${gruntConfig.backEnd.build.dir}/*`
  ],
  scriptsBuild: [
    `${gruntConfig.scripts.build.dir}/*`
  ]
};
