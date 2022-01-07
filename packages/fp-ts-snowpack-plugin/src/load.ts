import {
  either as E,
  option as O,
  readonlyRecord as RC,
  stateReaderTaskEither as SRTE,
} from "fp-ts";
import { identity, pipe } from "fp-ts/lib/function";
import * as sp from "snowpack";
import { Ext, PluginFactoryParameters, SnowpackOutputMap } from "./types";

/**
 * @summary
 * Snowpack's `PluginLoadOptions` type,
 * where the `fileExt` is strictly typed.
 */
export interface LoadOptions<I extends Ext>
  extends Readonly<Omit<sp.PluginLoadOptions, "fileExt">> {
  readonly fileExt: I;
}

/**
 * @summary
 * All of the readonly information available in the scope
 * of a the `load` hook, as a struct.
 */
export interface LoadDeps<R, I extends Ext> extends PluginFactoryParameters<R> {
  readonly loadOptions: LoadOptions<I>;
}

export type LoadResult<O extends Ext> = O.Option<
  RC.ReadonlyRecord<O, SnowpackOutputMap>
>;

/**
 * @summary
 * Functional signature for Snowpack's `load` hook.
 */
export interface Load<S, R, I extends Ext, O extends Ext>
  extends SRTE.StateReaderTaskEither<
    S,
    LoadDeps<R, I>,
    unknown,
    LoadResult<O>
  > {}

export const fromLoadResult = <O extends Ext>(
  loadResult: LoadResult<O>
): sp.PluginLoadResult | string | null =>
  pipe(
    loadResult,
    O.map(
      RC.map(({ code, map }) => ({
        code: pipe(code, E.getOrElseW(identity)),
        map: O.toNullable(map),
      }))
    ),
    O.map((a) => a),
    O.toNullable
  );

export const toLoadOptions = <I extends Ext>({
  fileExt,
  ...rest
}: sp.PluginLoadOptions): LoadOptions<I> => ({
  ...rest,
  fileExt: fileExt as I,
});
