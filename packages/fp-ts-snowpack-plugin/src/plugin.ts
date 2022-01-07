import {
  either as E,
  io as IO,
  ioEither as IOE,
  ioRef as IOR,
  option as O,
  reader as R,
  readerTaskEither as RTE,
  readonlyArray as A,
  stateReaderTaskEither as SRTE,
  task as T,
  taskEither as TE,
} from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { fst } from "fp-ts/lib/Tuple";
import * as d from "io-ts/Decoder";
import * as sp from "snowpack";
import { toLoadOptions, fromLoadResult } from "./load";
import { toTransformOptions, fromTransformResult } from "./transform";
import { Ext, PluginDeps, PluginFactoryParameters } from "./types";
import { runStateIORef, throwError } from "./utils";

/**
 * @summary
 * The entrypoint for transform fp-ts bindings into snowpack bindings.
 *
 * - `R` is the plugin configuration.
 * - `S` is the internal state used between the method calls.
 * - `I` and `O` are the input and output file extensions respectively.
 */
export function toPlugin<R, I extends Ext, O extends Ext, S>({
  name,
  decoder,
  knownEntrypoints = A.zero(),
  initialize,
  resolve = { input: A.zero(), output: A.zero() },
  load = SRTE.of(O.none),
  transform = SRTE.of(O.none),
}: PluginDeps<S, R, I, O>): sp.SnowpackPluginFactory<R> {
  return (snowpackConfig, pluginOptions_) => {
    const deps = pipe(
      decoder.decode(pluginOptions_),
      E.map(
        (pluginOptions): PluginFactoryParameters<R> => ({
          pluginOptions,
          snowpackConfig,
        })
      ),
      E.mapLeft(d.draw),
      E.matchW(throwError, IO.of)
    )();

    const ref = pipe(initialize(deps), IOE.matchEW(throwError, IOR.newIORef))();

    const _transform = pipe(
      transform,
      runStateIORef(RTE.MonadIO)(ref),
      RTE.map(fst),
      RTE.map(fromTransformResult),
      RTE.local((transformOptions: sp.PluginTransformOptions) => ({
        transformOptions: toTransformOptions<I>(transformOptions),
        ...deps,
      })),
      R.map(TE.matchE(throwError, T.of))
    );

    const _load = pipe(
      load,
      runStateIORef(RTE.MonadIO)(ref),
      RTE.map(fst),
      RTE.map(fromLoadResult),
      RTE.local((loadOptions: sp.PluginLoadOptions) => ({
        loadOptions: toLoadOptions<I>(loadOptions),
        ...deps,
      })),
      R.map(TE.matchE(throwError, T.of))
    );

    return {
      name,
      knownEntrypoints: A.toArray(knownEntrypoints),
      resolve: resolve as any,
      async transform(transformOptions) {
        await _transform(transformOptions)();
      },
      async load(loadOptions) {
        await _load(loadOptions)();
      },
    };
  };
}
