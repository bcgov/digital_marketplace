module.exports = {
  frontEndTypeScript: `npx tsc --project "${gruntConfig.frontEnd.src.ts}" --outDir "${gruntConfig.frontEnd.tmp.dir}"`,
  backEndTypeScript: `npx tsc --project "${gruntConfig.backEnd.src.dir}" --outDir "${gruntConfig.backEnd.build.dir}"`,
  backEndStart: "npm run back-end:start"
};
