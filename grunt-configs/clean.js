module.exports = {
  frontEndTmp: [`${gruntConfig.frontEnd.tmp.dir}/../../*`],
  frontEndBuild: [`${gruntConfig.frontEnd.build.dir}/*`],
  backEndBuild: [`${gruntConfig.backEnd.build.dir}/*`],
  scriptsBuild: [`${gruntConfig.scripts.build.dir}/*`],
  learnFrontEndTmp: [`${gruntConfig.learnFrontEnd.tmp.dir}/*`],
  learnFrontEndBuild: [`${gruntConfig.learnFrontEnd.build.dir}/*`]
};
