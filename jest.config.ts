import type { Config } from "@jest/types";
import common from "./tests/jest.common";

const config: Config.InitialOptions = {
  ...common,
  collectCoverageFrom: ["**/src/**/*.+(js|ts|tsx)"],
  projects: [
    "tests/jest.front-end.ts",
    "tests/jest.back-end.unit.ts",
    "tests/jest.back-end.integration.ts"
  ]
};

export default config;
