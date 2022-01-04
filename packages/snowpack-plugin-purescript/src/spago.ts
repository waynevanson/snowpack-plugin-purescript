/**
 * @description
 * Utilities for navigating spago related stuff.
 */

import {
  either as E,
  identity as I,
  ioEither as IOE,
  option as O,
  reader as R,
  readonlyArray as A,
} from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import * as path from "path";
import { ConsoleType, SnowpackPurescriptPluginOptions } from "./index";
import { execaCommandSyncFp, globSyncFp } from "./utils";

export interface SpagoDeps {
  readonly spagoProjectDir: string;
  readonly execaCommandSync: (
    command: string
  ) => IOE.IOEither<ConsoleType, string>;
  readonly globSync: (pattern: string) => IOE.IOEither<ConsoleType, string[]>;
}

export const deps = ({
  pluginConfiguration,
  snowpackConfig,
}: SnowpackPurescriptPluginOptions): SpagoDeps =>
  pipe(
    I.Do,
    I.bind("spagoProjectDir", () =>
      path.join(
        snowpackConfig.root,
        pluginConfiguration?.spagoProjectDir || "./"
      )
    ),
    I.bind("execaCommandSync", ({ spagoProjectDir }) =>
      pipe(execaCommandSyncFp({ cwd: spagoProjectDir }))
    ),
    I.bind("globSync", ({ spagoProjectDir }) =>
      globSyncFp({ cwd: spagoProjectDir })
    )
  );

export interface DepsSpagoOutputDir
  extends Pick<SpagoDeps, "execaCommandSync" | "spagoProjectDir"> {}

export const spagoOutputDir = ({
  execaCommandSync,
  spagoProjectDir,
}: DepsSpagoOutputDir) =>
  pipe(
    execaCommandSync("spago path"),
    IOE.chainEitherKW((stdout) =>
      pipe(
        stdout.match(/(?<=^output: )[\w\d/.]*/),
        O.fromNullable,
        O.chain(A.lookup(0)),
        E.fromOption((): ConsoleType => E.left([`Could not find the output`]))
      )
    ),
    IOE.map((to) => path.join(spagoProjectDir, to))
  );

export interface DepsPursSourceGlobs
  extends Pick<SpagoDeps, "execaCommandSync"> {}

export const pursSourceGlobs: R.Reader<
  DepsPursSourceGlobs,
  IOE.IOEither<ConsoleType, ReadonlyArray<string>>
> = ({ execaCommandSync }) =>
  pipe(
    execaCommandSync("spago sources"),
    IOE.map((stdout) => stdout.split("\n"))
  );

export interface DepsPursFiles extends Pick<SpagoDeps, "globSync"> {
  readonly pursSourceGlobs: ReadonlyArray<string>;
}

export const pursFiles: R.Reader<
  DepsPursFiles,
  IOE.IOEither<ConsoleType, ReadonlyArray<string>>
> = ({ globSync, pursSourceGlobs }) =>
  pipe(pursSourceGlobs, IOE.traverseArray(globSync), IOE.map(A.flatten));

export interface DeferredDeps {
  readonly spagoOutputDir: string;
  readonly pursSourceGlobs: ReadonlyArray<string>;
  readonly pursFiles: ReadonlyArray<string>;
}

export const deferred: R.Reader<
  SpagoDeps,
  IOE.IOEither<ConsoleType, DeferredDeps>
> = ({ globSync, execaCommandSync, spagoProjectDir }) =>
  pipe(
    IOE.Do,
    IOE.apS(
      "spagoOutputDir",
      spagoOutputDir({ execaCommandSync, spagoProjectDir })
    ),
    IOE.apS("pursSourceGlobs", pursSourceGlobs({ execaCommandSync })),
    IOE.bind("pursFiles", ({ pursSourceGlobs }) =>
      pipe(
        pursFiles({ globSync, pursSourceGlobs }),
        IOE.map(A.map((pursFile) => path.join(spagoProjectDir, pursFile)))
      )
    )
  );
