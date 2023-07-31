import type { Config } from "@jest/types";
import unit from "./jest.back-end.unit";

const config: Config.InitialOptions = {
  ...unit,
  roots: ["./tests/back-end/integration"],
  displayName: "back-end:integration",
  setupFiles: ["<rootDir>/tests/back-end/setup-env.jest.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/back-end/setup-server.jest.ts"],
  testTimeout: 10000
};

export default config;
