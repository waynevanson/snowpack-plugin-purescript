import { commandSync } from "execa";
import * as path from "path";

describe("basic", () => {
  it("should build", () => {
    const inner = path.join(__dirname, "/basic");
    console.log(inner);
    commandSync("pnpm snowpack build", { cwd: inner });
  });
});
