import * as path from 'path';
import * as fs from 'fs-extra';
import findUp from 'find-up';
import memoize from './memoize';
import * as logger from './logger';

function isModularRoot(packageJsonPath: string) {
  const packageJson = fs.readJSONSync(packageJsonPath, {
    encoding: 'utf8',
  }) as { modular?: Record<string, unknown> };
  return packageJson?.modular?.type === 'root';
}

// This function is not memoized and gets executed at most twice:
// when it's accessed directly (at init time) and when it's accessed via getModularRoot (at command time)
// The reason for this is that we might want to refresh the modular root
// in case we run on a non-modular directory to upgrade to a modular one,
// on which we still need to do checks (see for example the "convert" command)

export const findModularRoot = function findModularRoot(): string | undefined {
  try {
    logger.debug('Deferring to find-up to locate modular root');
    const modularRoot = findUp.sync(
      (directory: string) => {
        const packageJsonPath = path.join(directory, 'package.json');
        if (
          findUp.sync.exists(packageJsonPath) &&
          isModularRoot(packageJsonPath)
        ) {
          return packageJsonPath;
        }
        return;
      },
      { type: 'file', allowSymlinks: false },
    );

    return modularRoot ? path.normalize(path.dirname(modularRoot)) : undefined;
  } catch (err) {
    throw new Error(err as string);
  }
};

function getModularRoot(): string {
  const modularRoot = findModularRoot();

  if (modularRoot === undefined) {
    throw new Error('Could not find modular root.');
  }

  logger.debug(`Located modular root ${modularRoot}`);
  return modularRoot;
}

export default memoize(getModularRoot);
