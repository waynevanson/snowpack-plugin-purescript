import type { Config } from "@jest/types";
import { defaults as tsjest } from "ts-jest/presets";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  projects: [
    {
      ...tsjest,
      displayName: "unit",
      testMatch: ["<rootDir>/tests/unit/*", ...(tsjest.testMatch || [])],
    },
    {
      ...tsjest,
      displayName: "e2e",
      testMatch: ["<rootDir>/tests/e2e/*", ...(tsjest.testMatch || [])],
      globalSetup: "./jestSetup.ts",
    },
  ],
};

export default config;
