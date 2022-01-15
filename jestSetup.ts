import { commandSync } from "execa";
import path = require("path/posix");

export default async function () {
  commandSync("pnpm tsc");
}
