import type { Config } from "@jest/types";
import common from "./jest.common";

const config: Config.InitialOptions = {
  ...common,
  roots: ["./tests/back-end/unit"],
  displayName: "back-end:unit",
  testEnvironment: "jest-environment-node",
  clearMocks: true
};

export default config;
