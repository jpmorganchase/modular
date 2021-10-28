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

function getModularRoot(): string {
  try {
    logger.debug('Deferring to find-up to locate modular root');
    let modularRoot = findUp.sync(
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

    if (modularRoot === undefined) {
      throw new Error('Could not find modular root.');
    }

    modularRoot = path.normalize(path.dirname(modularRoot));

    logger.debug(`Located modular root ${modularRoot}`);
    return modularRoot;
  } catch (err) {
    console.log(logger);
    throw new Error(err as string);
  }
}

export default memoize(getModularRoot);
