import type { Config } from "@jest/types";

const config: Config.InitialProjectOptions = {
  globalSetup: "./jestSetup.ts",
};

export default config;
