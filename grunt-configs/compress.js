const compressions = [
  ["brotli", "br"],
  ["gzip", "gz"]
];

const options = (mode) => ({
  mode,
  pretty: true
});

const files = (ext) => [
  {
    expand: true,
    filter: "isFile",
    src: [
      `${gruntConfig.frontEnd.build.dir}/**/*`, //compress all build assets
      `!${gruntConfig.frontEnd.build.dir}/**/*.woff2`, //woff2 fonts are already well-compressed
      ...compressions.map(
        ([, ext]) => `!${gruntConfig.frontEnd.build.dir}/**/*.${ext}`
      ) //don't recompress files
    ],
    dest: gruntConfig.frontEnd.build.dir,
    rename(_dest, src) {
      // No need to relativize src against src dir as they
      // are read from build dir.
      return `${src}.${ext}`;
    }
  }
];

const task = (name, ext) => ({
  options: options(name),
  files: files(ext)
});

module.exports = compressions.reduce(
  (config, [name, ext]) => ({
    ...config,
    [name]: task(name, ext)
  }),
  {}
);
