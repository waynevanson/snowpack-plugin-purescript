import {
  console as Console,
  either as E,
  option as O,
  reader as R,
  readonlyArray as A,
  readonlyRecord as RC,
  task as T,
  taskEither as TE,
} from "fp-ts";
import { fs } from "fp-ts-node";
import { Endomorphism } from "fp-ts/lib/Endomorphism";
import { constVoid, pipe } from "fp-ts/lib/function";
import { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord";
import * as path from "path";
import {
  MountEntry,
  PluginLoadOptions,
  SnowpackConfig,
  SnowpackPluginFactory,
} from "snowpack";
import { deferred, DeferredDeps, deps, SpagoDeps } from "./spago";
import { isChildInParent, symlink } from "./utils";

export interface PurescriptPluginOptions {
  /**
   * Path to spago project directory,
   * which should contain a `spago.dhall` file.
   */
  spagoProjectDir: string;
  sourceMaps: boolean;
}

export interface SnowpackPurescriptPluginOptions {
  snowpackConfig: SnowpackConfig;
  pluginConfiguration: PurescriptPluginOptions;
}

/** Right is a warning and left is an Error */
export type ConsoleType = E.Either<string[], string[]>;

export interface DepsSanityCheck
  extends Pick<PluginLoadOptions, "filePath">,
    Pick<SpagoDeps, "spagoProjectDir">,
    Pick<DeferredDeps, "pursFiles"> {}

const sanityCheck: R.Reader<DepsSanityCheck, E.Either<ConsoleType, void>> = ({
  filePath,
  spagoProjectDir,
  pursFiles,
}) => {
  return pipe(
    filePath,
    E.fromPredicate(
      (filePath) => pursFiles.includes(filePath),
      (filePath): ConsoleType =>
        E.left([
          `"${filePath}" is not part of the spago project located in "${spagoProjectDir}".`,
        ])
    ),
    E.map(constVoid)
  );
};
export interface DepsMount
  extends Pick<SnowpackConfig, "root">,
    Pick<PluginLoadOptions, "filePath"> {}

export function mounts({
  root,
  filePath,
}: DepsMount): Endomorphism<ReadonlyRecord<string, MountEntry>> {
  return RC.filterWithIndex((mount, _) =>
    isChildInParent(path.resolve(root, mount), filePath)
  );
}

export function pursModuleName(fileContents: string) {
  return pipe(
    fileContents.match(/(?<=^module )[\w.]*/gm),
    O.fromNullable,
    O.chain(A.lookup(0)),
    E.fromOption(
      (): ConsoleType =>
        E.left([`Purescript fileContents does not contain a module`])
    )
  );
}

export interface Edge<A> {
  from: A;
  to: A;
}

export interface DepsOutputDir {
  readonly buildOptionsOut: string;
  readonly url: string;
  readonly pursFileAsDirRelativeFromMount: string;
}

export function outputFileDir({
  buildOptionsOut: baseBuildDir,
  url,
  pursFileAsDirRelativeFromMount,
}: DepsOutputDir): string {
  return path.join(baseBuildDir, url, pursFileAsDirRelativeFromMount);
}

export interface DepsInputDir extends Pick<DeferredDeps, "spagoOutputDir"> {
  readonly pursModuleName: string;
}

export function inputDir({ spagoOutputDir, pursModuleName }: DepsInputDir) {
  return path.join(spagoOutputDir, pursModuleName);
}

export interface DepsToSymlinks
  extends DepsInputDir,
    Pick<DepsOutputDir, "buildOptionsOut">,
    Pick<PluginLoadOptions, "filePath">,
    Pick<SnowpackConfig, "mount"> {}

export function toSymlinks({
  buildOptionsOut,
  filePath,
  pursModuleName,
  spagoOutputDir,
  mount,
}: DepsToSymlinks): ReadonlyArray<Edge<string>> {
  return pipe(
    mount,
    RC.toReadonlyArray,
    A.map(([src, { url }]) => ({
      from: inputDir({ spagoOutputDir, pursModuleName }),
      to: outputFileDir({
        buildOptionsOut,
        url,
        pursFileAsDirRelativeFromMount: path.join(
          path.relative(src, path.basename(filePath, ".purs"))
        ),
      }),
    }))
  );
}

export const purescriptPlugin: SnowpackPluginFactory<PurescriptPluginOptions> =
  (
    snowpackConfig,
    pluginConfiguration = { spagoProjectDir: "./", sourceMaps: false }
  ) => {
    // these will be used for multiple files, so we're basically caching them into memory (how cool!)

    const config: SnowpackPurescriptPluginOptions = {
      snowpackConfig,
      pluginConfiguration,
    };
    const depss = deps(config);
    const undeferred = deferred(depss)();

    const { spagoProjectDir, execaCommandSync, globSync } = depss;
    const {
      buildOptions: { out: buildOptionsOut },
      root,
    } = snowpackConfig;

    // TODO build the spago project before load function,
    // and when files change

    return {
      name: "snowpack-plugin-purescript",
      resolve: { input: [".purs"], output: [".js"] },

      async load({ filePath }) {
        const program = pipe(
          undeferred,
          E.chainFirstW(({ pursFiles }) =>
            sanityCheck({ pursFiles, spagoProjectDir, filePath })
          ),
          E.apSW(
            "mount",
            pipe(snowpackConfig.mount, mounts({ filePath, root }), E.right)
          ),
          TE.fromEither,
          TE.apSW(
            "pursModuleName",
            pipe(
              filePath,
              fs.readFile({ encoding: "utf-8" }),
              TE.chainEitherKW(pursModuleName)
            )
          ),
          TE.bindW("symlinks", ({ spagoOutputDir, mount, pursModuleName }) =>
            TE.right(
              toSymlinks({
                mount,
                filePath,
                pursModuleName,
                spagoOutputDir,
                buildOptionsOut,
              })
            )
          ),
          TE.chainFirstW(({ symlinks }) =>
            pipe(
              symlinks,
              TE.traverseArray(({ from, to }) => symlink(from, to, "dir"))
            )
          )
        );

        // todo - catch the bad stuff
        const main = pipe(
          program,
          TE.matchEW(T.fromIOK(Console.error), T.fromIOK(Console.log))
        );

        await main();

        // get the file structure

        // replicate structure of source files to output directory
      },
      onChange() {},
      async cleanup() {
        // shutdown purs and spago processes
      },
    };
  };

export default purescriptPlugin;
