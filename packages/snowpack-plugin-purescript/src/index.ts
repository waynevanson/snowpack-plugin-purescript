import * as s from "@unsplash/sum-types";
import { option as O, stateReaderTaskEither as SRTE } from "fp-ts";
import { Load, readerIOEither as RIOE, toPlugin } from "fp-ts-snowpack-plugin";
import { constVoid, pipe } from "fp-ts/function";
import * as d from "io-ts/Decoder";
import { SnowpackPluginFactory } from "snowpack";

export type Mode =
  | s.Member<"compiling">
  | s.Member<"compiled">
  | s.Member<"build", void>;

export interface DepsPurescriptPlugin {
  readonly projectDirectory: string;
  // readonly outputDirectory: string;
}

const decoder: d.Decoder<unknown, DepsPurescriptPlugin> = pipe(
  d.struct({
    projectDirectory: d.string,
  }),
  d.readonly
);

// watch mode for spago and purs
//

export const load = pipe(
  SRTE.of(O.none) as Load<void, DepsPurescriptPlugin, ".purs", ".js">,
  SRTE.map(() => O.none)
);

const plugin: SnowpackPluginFactory<DepsPurescriptPlugin> = toPlugin({
  name: "purescript",
  decoder,
  resolve: {
    input: [".purs"],
    output: [".js"],
  },
  initialize: RIOE.of(constVoid()),
  load,
});

export default plugin;
