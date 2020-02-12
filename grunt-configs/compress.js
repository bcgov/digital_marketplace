// TODO compress other static assets as required (e.g. images)
const options = mode => ({
  mode,
  pretty: true
});

const files = ext => [
  { src: [gruntConfig.out.js], dest: `${gruntConfig.out.js}.${ext}`, filter: "isFile" },
  { src: [gruntConfig.out.css], dest: `${gruntConfig.out.css}.${ext}`, filter: "isFile" }
];

const task = (name, ext) => ({
  options: options(name),
  files: files(ext)
});

module.exports = {
  brotli: task('brotli', 'br'),
  gzip: task('gzip', 'gz')
};
