module.exports = {
  frontEndTypeScript: `npx tsc --project "${gruntConfig.frontEnd.src.ts}" --outDir "${gruntConfig.frontEnd.tmp.dir}"`,
  backEndTypeScript: `npx tsc --project "${gruntConfig.backEnd.src.dir}" --outDir "${gruntConfig.backEnd.build.dir}"`,
  scriptsTypeScript: `npx tsc --project "${gruntConfig.scripts.src.dir}" --outDir "${gruntConfig.scripts.build.dir}"`,
  learnFrontEndTypeScript: `npx tsc --project "${gruntConfig.learnFrontEnd.src.ts}" --outDir "${gruntConfig.learnFrontEnd.tmp.dir}"`,
  learnFrontEndServe: `cd "${gruntConfig.learnFrontEnd.build.dir}" && npx serve --listen 3000 --single --cors`
};
