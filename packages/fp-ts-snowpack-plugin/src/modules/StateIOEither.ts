import { either as E, ioEither as IOE, stateT } from "fp-ts";
import { Applicative3 } from "fp-ts/lib/Applicative";
import { Apply3 } from "fp-ts/lib/Apply";
import { Chain3 } from "fp-ts/lib/Chain";
import { Functor3 } from "fp-ts/lib/Functor";
import * as functor from "fp-ts/lib/Functor";

import { pipeable, PipeableFunctor3 } from "fp-ts/lib/pipeable";
import { Pointed3 } from "fp-ts/lib/Pointed";
import { ApplicativeSeq } from "fp-ts/lib/Task";
import { FromEither3 } from "fp-ts/lib/FromEither";
import { pipe } from "fp-ts/lib/function";
import { Monad3 } from "fp-ts/lib/Monad";

export const URI = "StateIOEither";
export type URI = typeof URI;

export interface StateIOEither<S, E, A>
  extends stateT.StateT2<IOE.URI, S, E, A> {}

declare module "fp-ts/HKT" {
  export interface URItoKind3<R, E, A> {
    readonly [URI]: StateIOEither<R, E, A>;
  }
}

const stateM = stateT.getStateM(IOE.Monad);
const Monad: Monad3<URI> = { URI, ...stateM };

export const { chain, chainFirst, map, ap, apFirst, apSecond, flatten } =
  pipeable(Monad);

export const { of, put, fromState, fromM: fromIOEither, get, gets } = stateM;

export const execute =
  <S, E, A>(s: S) =>
  (fa: StateIOEither<S, E, A>): IOE.IOEither<E, S> =>
    stateM.execState(fa, s);

export const chainW =
  <S2, E2, A1, A2>(f: (a: A1) => StateIOEither<S2, E2, A2>) =>
  <S1, E1>(
    fa: StateIOEither<S1, E1, A1>
  ): StateIOEither<S1 & S2, E1 | E2, A2> =>
    chain(f)(fa as any) as any;

export const FromEither: FromEither3<URI> = {
  URI,
  fromEither: (fa) => (s) => () =>
    pipe(
      fa,
      E.map((a) => [a, s])
    ),
};

export const { fromEither } = FromEither;
