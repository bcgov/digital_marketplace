import type { Config } from "@jest/types";
import common from "./tests/jest.common";

const config: Config.InitialOptions = {
  ...common,
  collectCoverageFrom: ["**/src/**/*.+(js|ts|tsx)"],
  projects: ["tests/jest.front-end.ts"]
};

export default config;
