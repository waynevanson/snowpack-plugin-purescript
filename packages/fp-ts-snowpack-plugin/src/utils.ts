import { ioRef as IOR, stateT } from "fp-ts";
import { Kind3, URIS3 } from "fp-ts/lib/HKT";
import { MonadIO3 } from "fp-ts/lib/MonadIO";

export function runStateIORef<M extends URIS3>(M: MonadIO3<M>) {
  return <S>(ref: IOR.IORef<S>) =>
    <R, E, A>(fa: stateT.StateT3<M, S, R, E, A>): Kind3<M, R, E, [A, S]> =>
      M.chain(M.fromIO(ref.read), (s) =>
        M.chain(fa(s), ([a, s]) => M.map(M.fromIO(ref.write(s)), () => [a, s]))
      );
}

export const throwError = (message: string) => () => {
  throw new Error(message);
};
