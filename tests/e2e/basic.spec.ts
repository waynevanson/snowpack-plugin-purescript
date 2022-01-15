import { commandSync } from "execa";
import * as path from "path";
import * as fs from "fs";

describe("basic", () => {
  it("should build", () => {
    const cwd = path.join(__dirname, "/fixtures/basic");
    commandSync("pnpm snowpack build", { cwd });
    expect(
      fs.readFileSync(path.join(cwd, "build/dist/Main.js"), {
        encoding: "utf-8",
      })
    ).toMatchSnapshot();
  });
});
