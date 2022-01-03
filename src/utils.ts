/**
 * @summary
 * Super niche fp utils.
 */
import { commandSync as execaCommandSync, SyncOptions } from "execa";
import { either as E, ioEither as IOE } from "fp-ts";
import { IOptions, sync as globSync } from "glob";
import * as path from "path";
import { ConsoleType } from ".";

/**
 *  @summary
 * `execaCommandSync` but fp-ts
 */
export const execaCommandSyncFp =
  (options?: SyncOptions) => (command: string) =>
    IOE.tryCatch(
      () => execaCommandSync(command, options).stdout,
      (e): ConsoleType => E.left((e as string).toString().split("\n"))
    );

/**
 *  @summary
 * `globSync` but fp-ts
 */
export const globSyncFp = (options?: IOptions) => (pattern: string) =>
  IOE.tryCatch(
    () => globSync(pattern, options),
    (e): ConsoleType => E.left((e as string).toString().split("\n"))
  );

/**
 * @summary
 * Is the child path contained in the parent path?
 */
export const isChildInParent = (parent: string, child: string): boolean => {
  const relative = path.relative(child, parent);
  return (
    relative == "" || [".", "./", "../"].some((x) => relative.startsWith(x))
  );
};
