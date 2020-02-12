const { join, relative } = require('path');

const compressions = [
  ['brotli', 'br'],
  ['gzip', 'gz']
];

const options = mode => ({
  mode,
  pretty: true
});

const files = ext => [{
  expand: true,
  filter: "isFile",
  src: [
    `${gruntConfig.dir.build}/**/*`,
    ...compressions.map(([_, ext]) => `!${gruntConfig.dir.build}/**/*.${ext}`)
  ],
  dest: gruntConfig.dir.build,
  rename(_dest, src) {
    // No need to relativize src against src dir as they
    // are read from build dir.
    return `${src}.${ext}`;
  }
}];

const task = (name, ext) => ({
  options: options(name),
  files: files(ext)
});

module.exports = compressions.reduce((config, [name, ext]) => ({
  ...config,
  [name]: task(name, ext)
}), {});
