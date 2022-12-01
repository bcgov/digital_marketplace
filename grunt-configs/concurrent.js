module.exports = {
  options: {
    logConcurrentOutput: true
  },
  frontEndWatch: [
    "watch:frontEndTS",
    "watch:frontEndSass",
    "watch:frontEndStatic"
  ],
  learnFrontEndWatch: [
    "watch:learnFrontEndTS",
    "watch:learnFrontEndSass",
    "watch:learnFrontEndStatic"
  ]
};
