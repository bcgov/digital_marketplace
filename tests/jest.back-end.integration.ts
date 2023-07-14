import type { Config } from "@jest/types";
import unit from "./jest.back-end.unit";

const config: Config.InitialOptions = {
  ...unit,
  roots: ["./tests/back-end/integration"],
  displayName: "back-end:integration",
  setupFilesAfterEnv: ["<rootDir>/tests/back-end/setup.jest.ts"],
  globalSetup: "<rootDir>/tests/utils/global-setup.ts",
  globalTeardown: "<rootDir>/tests/utils/global-teardown.ts"
};

export default config;
