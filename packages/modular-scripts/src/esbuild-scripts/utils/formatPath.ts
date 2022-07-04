import path from 'path';

export function normalizeToPosix<T extends string | undefined>(pathName: T): T {
  return (
    pathName ? pathName.split(path.sep).join(path.posix.sep) : pathName
  ) as T;
}
