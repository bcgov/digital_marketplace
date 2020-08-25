module.exports = {
  typeScriptFrontEnd: `npx tsc --project "${gruntConfig.frontEnd.src.ts}" --outDir "${gruntConfig.frontEnd.tmp.dir}"`,
  typeScriptBackEnd: `npx tsc --project "${gruntConfig.backEnd.src.dir}" --outDir "${gruntConfig.backEnd.build.dir}"`
};
