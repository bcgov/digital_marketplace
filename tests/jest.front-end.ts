import type { Config } from "@jest/types";
import common from "./jest.common";

const config: Config.InitialOptions = {
  ...common,
  roots: ["./tests/front-end"],
  displayName: "front-end",
  testEnvironment: "jest-environment-jsdom"
};

export default config;
