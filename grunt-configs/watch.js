module.exports = {
  options: {
    interrupt: true,
    debounceDelay: 250
  },
  frontEndTS: {
    files: [
      `${gruntConfig.frontEnd.src.ts}/**`,
      `${gruntConfig.frontEnd.src.tsx}/**`,
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
    files: [`${gruntConfig.frontEnd.src.sass}/**`],
    tasks: ["sass:frontEndCss", "postcss:frontEndPrefix", "compress:gzip"]
  },
  frontEndStatic: {
    files: [
      `${gruntConfig.frontEnd.src.static}/**`,
      `${gruntConfig.frontEnd.src.html}/**`
    ],
    tasks: ["front-end-common", "compress:gzip"]
  },
  learnFrontEndTS: {
    files: [
      `${gruntConfig.learnFrontEnd.src.ts}/**`,
      `${gruntConfig.learnFrontEnd.src.tsx}/**`,
      `${gruntConfig.shared.src.dir}/**`,
      `${gruntConfig.frontEnd.src.ts}/**`
    ],
    tasks: [
      // Do not clean tmp dir here to ensure
      // TypeScript builds incrementally (faster).
      "shell:learnFrontEndTypeScript",
      "browserify:learnFrontEnd"
    ]
  },
  learnFrontEndSass: {
    files: [`${gruntConfig.learnFrontEnd.src.sass}/**`],
    tasks: ["sass:learnFrontEndCss", "postcss:learnFrontEndPrefix"]
  },
  learnFrontEndStatic: {
    files: [
      `${gruntConfig.learnFrontEnd.src.static}/**`,
      `${gruntConfig.learnFrontEnd.src.html}/**`
    ],
    tasks: ["learn-front-end-common"]
  }
};
