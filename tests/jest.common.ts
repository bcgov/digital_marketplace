import type { Config } from "@jest/types";
import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "../tsconfig.json";
import path from "path";

const config: Config.InitialOptions = {
  rootDir: path.join(__dirname, ".."),
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/"
  }),
  watchPlugins: [
    "jest-watch-select-projects",
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname"
  ],
  globalSetup: "<rootDir>/tests/utils/global-setup.ts",
  globalTeardown: "<rootDir>/tests/utils/global-teardown.ts"
};

export default config;
