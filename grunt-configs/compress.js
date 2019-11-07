// TODO compress other static assets as required (e.g. images)
module.exports = {
  all: {
    options: {
      mode: "gzip",
      pretty: true
    },
    files: [
      { src: [gruntConfig.out.js], dest: `${gruntConfig.out.js}.gz`, filter: "isFile" },
      { src: [gruntConfig.out.css], dest: `${gruntConfig.out.css}.gz`, filter: "isFile" }
    ]
  }
};
