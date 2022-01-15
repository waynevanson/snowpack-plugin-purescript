import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  globalSetup: "./jestSetup.ts",
};

export default config;
