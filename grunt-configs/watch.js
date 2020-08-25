module.exports = {
  options: {
    interrupt: true,
    debounceDelay: 250
  },
  js: {
    files: [
      `${gruntConfig.frontEnd.src.ts}/**`,
      `${gruntConfig.shared.src.dir}/**`
    ],
    tasks: [
      // Do not clean tmp dir here to ensure
      // TypeScript builds incrementally (faster).
      "shell:typeScriptFrontEnd",
      "browserify:frontEnd",
      "compress:gzip"
    ]
  },
  sass: {
    files: [
      `${gruntConfig.frontEnd.src.sass}/**`
    ],
    tasks: [
      "sass",
      "postcss:prefix",
      "compress:gzip"
    ]
  },
  static: {
    files: [
      `${gruntConfig.frontEnd.src.static}/**`
    ],
    tasks: [
      "front-end:common",
      "compress:gzip"
    ]
  },
};
