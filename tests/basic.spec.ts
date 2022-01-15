import { commandSync } from "execa";

describe("basic", () => {
  it("should build", () => {
    commandSync("pnpm snowpack build");
  });
});
