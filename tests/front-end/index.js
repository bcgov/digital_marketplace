const path = require("path");
const compilerOptionsRoot = require("../../tsconfig.json").compilerOptions;
const compilerOptionsChild = require("./tsconfig.json").compilerOptions;

const compilerOptions = { ...compilerOptionsRoot, ...compilerOptionsChild };

// Change the working directory for mocha.
process.chdir(__dirname);
// Override the tsconfig baseUrl to ensure path aliases still work.
compilerOptions.baseUrl = "../../";

require("tsconfig-paths").register({
  baseUrl: compilerOptions.baseUrl,
  paths: compilerOptions.paths
});

require("ts-node").register({
  project: "./tsconfig.json"
});

const Mocha = require("mocha");

// Configure the mocha test-runner.
// mocha.setup('bdd');
const mocha = new Mocha({
  ui: "bdd",
  globals: ["assert"]
});

// Load all tests.
const tests = ["unit/lib/framework/component/cmd"];

tests.forEach((t) => mocha.addFile(path.join(__dirname, t)));

// Run all tests.
mocha.run((failures) => {
  process.exit(failures ? 1 : 0);
});
