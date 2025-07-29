module.exports = {
  frontEndViteBuildProd:
    "VITE_NODE_ENV=production vite build --mode production",
  frontEndViteWatch:
    "VITE_NODE_ENV=development vite build --watch --mode development",
  backEndTypeScript: `npx tsc --project "${gruntConfig.backEnd.src.dir}" --outDir "${gruntConfig.backEnd.build.dir}"`,
  scriptsTypeScript: `npx tsc --project "${gruntConfig.scripts.src.dir}" --outDir "${gruntConfig.scripts.build.dir}"`,
  learnFrontEndTypeScript: `npx tsc --project "${gruntConfig.learnFrontEnd.src.ts}" --outDir "${gruntConfig.learnFrontEnd.tmp.dir}"`,
  learnFrontEndServe: `cd "${gruntConfig.learnFrontEnd.build.dir}" && npx serve --listen 3000 --single --cors`
};
