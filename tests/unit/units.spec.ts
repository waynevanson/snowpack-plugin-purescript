import { regexpJsModule, replacerJsModule } from "../../src/index";

describe("regexpJsModule", () => {
  it("matches import()", () => {
    const text = `import("./hello-world")`;
    const matches = text.match(regexpJsModule);
    console.log(matches);
    console.log(matches?.groups);
  });
});
