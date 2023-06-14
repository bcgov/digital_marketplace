import type { Config } from "@jest/types";
import common from "./jest.common";

const config: Config.InitialOptions = {
  ...common,
  roots: ["./tests/back-end"],
  displayName: "back-end",
  testEnvironment: "jest-environment-node",
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/tests/back-end/setup.jest.ts"]
};

export default config;
