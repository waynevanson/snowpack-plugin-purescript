import { commandSync } from "execa";

export default async function () {
  console.log("\nbuilding plugin");
  commandSync("pnpm build");

  console.log("plugin complete, installing into test fixtures");
  commandSync("pnpm i");
}
