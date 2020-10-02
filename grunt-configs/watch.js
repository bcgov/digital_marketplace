module.exports = {
  options: {
    interrupt: true,
    debounceDelay: 250
  },
  frontEndTS: {
    files: [
      `${gruntConfig.frontEnd.src.ts}/**`,
      `${gruntConfig.shared.src.dir}/**`
    ],
    tasks: [
      // Do not clean tmp dir here to ensure
      // TypeScript builds incrementally (faster).
      "shell:frontEndTypeScript",
      "browserify:frontEnd",
      "compress:gzip"
    ]
  },
  frontEndSass: {
    files: [
      `${gruntConfig.frontEnd.src.sass}/**`
    ],
    tasks: [
      "sass",
      "postcss:prefix",
      "compress:gzip"
    ]
  },
  frontEndStatic: {
    files: [
      `${gruntConfig.frontEnd.src.static}/**`,
      `${gruntConfig.frontEnd.src.html}/**`
    ],
    tasks: [
      "front-end-common",
      "compress:gzip"
    ]
  }
};
