import path from 'path';

export function normalizeToPosix(pathName?: string): string | undefined {
  if (pathName) {
    return pathName.split(path.sep).join(path.posix.sep);
  }
}
