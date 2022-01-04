import {
  either as E,
  io as IO,
  ioEither as IOE,
  ioRef as IOR,
  option as O,
  readerTask as RT,
  readerTaskEither as RTE,
  readonlyArray as A,
  readonlyRecord as RC,
  stateReaderTaskEither as SRTE,
} from "fp-ts";
import { absurd, constVoid, pipe } from "fp-ts/lib/function";
import * as d from "io-ts/Decoder";
import * as sp from "snowpack";
import { readerIOEither as RIOE, stateIOEither as SIOE } from "./modules";

export interface DepsSnowpackPluginFactory<A> {
  readonly snowpackConfig: sp.SnowpackConfig;
  readonly pluginOptions: A; // use io-ts?
}

export type Ext = `.${string}`;

export interface Resolve<I extends Ext, O extends Ext> {
  readonly input: ReadonlyArray<I>;
  readonly output: ReadonlyArray<O>;
}

export interface PluginLoadOptionsBase<I extends Ext>
  extends Readonly<Omit<sp.PluginLoadOptions, "fileExt">> {
  readonly fileExt: I;
}

export interface PluginLoadOptions<R, I extends Ext>
  extends DepsSnowpackPluginFactory<R> {
  readonly loadOptions: PluginLoadOptionsBase<I>;
}

export interface SnowpackOutputMap {
  readonly code: string;
  readonly map: O.Option<string>;
}

export type PluginLoadResult<O extends Ext> = RC.ReadonlyRecord<
  O,
  SnowpackOutputMap
>;

export interface Load<S, R, I extends Ext, O extends Ext>
  extends SRTE.StateReaderTaskEither<
    S,
    PluginLoadOptions<R, I>,
    unknown,
    O.Option<PluginLoadResult<O>>
  > {}

export interface Transform<S>
  extends SRTE.StateReaderTaskEither<
    S,
    sp.PluginTransformOptions,
    unknown,
    void
  > {}

export interface OnChange<S> extends SIOE.StateIOEither<S, unknown, void> {}

export interface Initialize<R, A>
  extends RIOE.ReaderIOEither<DepsSnowpackPluginFactory<R>, unknown, A> {}

export interface DepsSnowpackPluginLoad<S, R, I extends Ext, O extends Ext> {
  readonly resolve: Resolve<I, O>;
  readonly load: Load<S, R, I, O>;
}

export interface DepsSnowpackPluginBase<S, R> {
  /** Name of the plugin */
  readonly name: string;
  /** Decode the plugin options to an initial value */
  readonly decoder: d.Decoder<unknown, R>;
  /** Calls side effects and before returning the hooks (sync) */
  readonly initialize?: Initialize<R, S>;
  readonly knownEntrypoints?: ReadonlyArray<string>;
  readonly transform?: Transform<S>;
  readonly onChange?: OnChange<S>;
}

export type DepsSnowpackPlugin<S, R, I extends Ext, O extends Ext> =
  | (DepsSnowpackPluginBase<S, R> &
      RC.ReadonlyRecord<keyof DepsSnowpackPluginLoad<S, R, I, O>, never>)
  | (DepsSnowpackPluginBase<S, R> & DepsSnowpackPluginLoad<S, R, I, O>);

export function toPlugin<S, R, I extends Ext, O extends Ext>({
  name,
  decoder,
  knownEntrypoints,
  resolve = { input: A.zero<I>(), output: A.zero<O>() },
  load,
  initialize,
}: DepsSnowpackPlugin<S, R, I, O>): sp.SnowpackPluginFactory<R> {
  return (snowpackConfig, pluginOptions_) => {
    const deps = pipe(
      decoder.decode(pluginOptions_),
      E.map(
        (pluginOptions): DepsSnowpackPluginFactory<R> => ({
          pluginOptions,
          snowpackConfig,
        })
      ),
      IOE.fromEither,
      // error as bad config
      IOE.matchEW((e) => () => absurd(e as never) as never, IO.of)
    )();

    const ref = pipe(
      initialize(deps),
      // initialize went wrong
      IOE.matchEW((e) => () => absurd(e as never) as never, IOR.newIORef)
    )();

    return {
      name,
      knownEntrypoints: knownEntrypoints as string[],
      resolve: resolve as any,

      onChange() {
        /// fromIO to
        const aa = pipe(ref.read);
      },

      async transform() {},

      async load(loadOptions) {
        const loader = pipe(
          load,
          SRTE.map(O.getOrElseW(constVoid)),
          SRTE.chainFirst(() =>
            pipe(
              SRTE.get<S, PluginLoadOptions<R, I>, unknown>(),
              SRTE.chainIOK(ref.write)
            )
          )
        );

        const task = pipe(
          ref.read,
          RTE.fromIO,
          RTE.chainW((s) => pipe(loader, SRTE.evaluate(s))),
          // task went wrong.
          RTE.getOrElseW(RT.fromIOK((e) => () => absurd(e as never) as never))
        );

        const options: PluginLoadOptions<R, I> = {
          loadOptions: loadOptions as any,
          ...deps,
        };

        await task(options)();
      },
    };
  };
}
