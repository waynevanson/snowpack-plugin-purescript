import { either as E, option as O, stateReaderTaskEither as SRTE } from "fp-ts";
import { identity, pipe } from "fp-ts/lib/function";
import * as sp from "snowpack";
import { Code, Ext, PluginFactoryParameters, SourceMap } from "./types";
import * as d from "io-ts/Decoder";

export interface TransformOptions<I extends Ext>
  extends Omit<sp.PluginTransformOptions, "fileExt" | "contents"> {
  readonly contents: Code;
  readonly fileExt: I;
}

export interface TransformDeps<R, I extends Ext>
  extends PluginFactoryParameters<R> {
  readonly transformOptions: TransformOptions<I>;
}

export type TransformResult = O.Option<{
  readonly code: string;
  readonly sourcemap: O.Option<SourceMap>;
}>;

export interface Transform<S, R, I extends Ext>
  extends SRTE.StateReaderTaskEither<
    S,
    TransformDeps<R, I>,
    unknown,
    TransformResult
  > {}

export const fromTransformResult = (
  transformResult: TransformResult
): string | sp.PluginTransformResult | null =>
  pipe(
    transformResult,
    O.map(({ code, sourcemap }) =>
      pipe(
        sourcemap,
        O.map(E.getOrElseW(identity)),
        O.getOrElse(() => code)
      )
    ),
    O.toNullable
  );

export const toTransformOptions = <I extends Ext>({
  fileExt,
  contents,
  ...rest
}: sp.PluginTransformOptions): TransformOptions<I> => ({
  ...rest,
  fileExt: fileExt as I,
  contents: pipe(
    contents,
    d.string.decode,
    E.mapLeft(() => contents as Buffer)
  ),
});
