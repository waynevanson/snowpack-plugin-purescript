import { reader as R, ioEither as IOE, readerT } from "fp-ts";
import { Applicative3 } from "fp-ts/lib/Applicative";
import { Monad3 } from "fp-ts/lib/Monad";
import { pipeable } from "fp-ts/lib/pipeable";

export const URI = "ReaderIOEither";
export type URI = typeof URI;

export interface ReaderIOEither<S, E, A>
  extends R.Reader<S, IOE.IOEither<E, A>> {}

declare module "fp-ts/HKT" {
  export interface URItoKind3<R, E, A> {
    readonly [URI]: ReaderIOEither<R, E, A>;
  }
}

const readerM = readerT.getReaderM(IOE.Monad);

export const Monad: Monad3<URI> = { URI, ...readerM };
export const { ap, flatten, apSecond, apFirst, map, chainFirst, chain } =
  pipeable(Monad);
export const { fromM: fromIOEither, fromReader, of } = readerM;

export const Applicative: Applicative3<URI> = Monad;
