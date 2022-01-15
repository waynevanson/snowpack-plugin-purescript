import { commandSync } from "execa";
import { createReadStream } from "fs";
import { sync as glob } from "glob";
import * as path from "path";
import * as readline from "readline";
import { SnowpackPluginFactory } from "snowpack";
import * as fs from "fs/promises";

export interface Config {
  // output?: string;
  mount?: string;
  projectDirectory?: string;
}

const plugin: SnowpackPluginFactory<Config> = (
  snowpackConfig,
  { projectDirectory = ".", mount = "__purescript" } = {}
) => {
  const cwd = path.join(snowpackConfig.root, projectDirectory);
  const outputPath = path.join(cwd, "output");
  const sourcemaps = snowpackConfig.buildOptions.sourcemap !== false;

  commandSync(`spago build ${sourcemaps ? "--source-maps" : ""}`, { cwd });

  const sources = commandSync("spago sources", { cwd })
    .stdout.split("\n")
    .flatMap((pattern) => glob(pattern, { cwd }))
    .map((rel) => path.join(cwd, rel));

  const srcSources = sources.filter(
    (filePath) => !filePath.startsWith(".spago")
  );

  return {
    name: "snowpack-plugin-purescript",
    knownEntrypoints: [""],
    resolve: {
      input: [".purs"],
      output: [".js"],
    },
    async load({ filePath, isDev }) {
      if (isDev) {
        console.warn(
          "watching yet to be implemented, please use the build command instead."
        );
      }

      if (!srcSources.includes(filePath)) {
        console.error(
          `filePath "${filePath}" is not on of the following below, which is an error:`
        );
        console.error(srcSources);
        return;
      }

      const stream = createReadStream(filePath, { encoding: "utf-8" });
      const reader = readline.createInterface({ input: stream });

      // starts with `module `, then the module name, then either `(` or ` where`.
      const regexpPursModule =
        /(?<=module )([A-Z][A-z]*\.?)*(?!\.)(?=\s+where|\s*\()/;

      const pursModuleName = await new Promise<string>((resolve, reject) => {
        setTimeout(
          () => reject(`Could not find "${filePath}" module name`),
          5000
        );

        reader.on("line", (line) => {
          const value = (line.match(regexpPursModule) || [])[0];
          if (!value) return;
          reader.close();
          resolve(value);
        });
      });

      // todo - replace requires with the correct path
      // make it relative to the files folder instead of the output.modulename folder
      const code = await fs.readFile(
        path.join(outputPath, pursModuleName, "index.js"),
        { encoding: "utf-8" }
      );

      const regexpJsModule = /(?=)/g;

      const map = sourcemaps
        ? await fs.readFile(
            path.join(outputPath, pursModuleName, "index.js.map"),
            {
              encoding: "utf-8",
            }
          )
        : undefined;

      return { ".js": { code, map } };
    },
  };
};

export default plugin;
