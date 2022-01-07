import { either as E, option as O } from "fp-ts";
import { Decoder } from "io-ts/Decoder";
import * as sp from "snowpack";
import { RawSourceMap } from "snowpack";
import { Load } from "./load";
import { readerIOEither as RIOE } from "./modules";
import { Transform } from "./transform";

/// Miscellaneous

export type CustomLeft = unknown;

/**
 * @summary
 * Strings that start with a period and end with at least one character.
 */
export type Ext = `.${string}${string}`;

/// Snowpack

/**
 * @summary
 * `SnowpackPluginFactory` parameters as a struct.
 */
export interface PluginFactoryParameters<A> {
  readonly snowpackConfig: sp.SnowpackConfig;
  readonly pluginOptions: A;
}

export type Code = E.Either<Buffer, string>;

export interface SnowpackOutputMap {
  readonly code: Code;
  readonly map: O.Option<string>;
}

export type SourceMap = E.Either<string, RawSourceMap>;

/// Resolve

/**
 * @summary
 * The `resolve` property in the snowpack plugin configuration,
 * where the `input` and `output` extensions are strictly typed.
 *
 * Allows us to pass these generics to the `load` property in the
 * configuration.
 */
export interface Resolve<I extends Ext, O extends Ext> {
  readonly input: ReadonlyArray<I>;
  readonly output: ReadonlyArray<O>;
}

/// Load

/// Transform

/// Main

/**
 * @summary
 * Takes the Snowpack configuration as a dependency,
 * Returning the State
 */
export interface Initialize<R, S>
  extends RIOE.ReaderIOEither<PluginFactoryParameters<R>, unknown, S> {}

export interface PluginDeps<S, R, I extends Ext, O extends Ext> {
  readonly name: string;
  readonly knownEntrypoints?: ReadonlyArray<string>;
  readonly resolve?: Resolve<I, O>;
  readonly decoder: Decoder<unknown, R>;
  readonly initialize: Initialize<R, S>;
  readonly load?: Load<S, R, I, O>;
  readonly transform?: Transform<S, R, I>;
}
