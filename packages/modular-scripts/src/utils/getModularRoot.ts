import * as path from 'path';
import * as fs from 'fs-extra';
import findUp from 'find-up';
import memoize from './memoize';
import * as logger from './logger';
import execa from 'execa';

function isModularRoot(packageJsonPath: string) {
  const packageJson = fs.readJSONSync(packageJsonPath, {
    encoding: 'utf8',
  }) as { modular?: Record<string, unknown> };
  return packageJson?.modular?.type === 'root';
}

function findUpModularRoot(): string | undefined {
  return findUp.sync(
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
}

/**
 * This is a shortcut - when running in a git repo we bail out and
 * use the git repository root as the modular root. This handles
 * most use cases since people should be tracking their entire repo
 * as a modular repo.
 *
 * @returns string | undefined
 */
function getGitRoot() {
  try {
    const { stdout } = execa.sync(`git`, [`rev-parse`, `--show-toplevel`]);
    const packageJsonPath = path.join(stdout, 'package.json');
    if (isModularRoot(packageJsonPath)) {
      return stdout;
    }
  } catch (e) {
    /// clearly not in a git repo so just use the CWD
    return undefined;
  }
}

function getModularRoot(): string {
  try {
    let modularRoot: string | undefined = getGitRoot();
    if (modularRoot) {
      logger.debug(`Using git located modular root.`);
    } else {
      logger.debug('Deferring to find-up to locate modular root');
      modularRoot = findUpModularRoot();
      if (modularRoot === undefined) {
        throw new Error('Could not find modular root.');
      }
      modularRoot = path.dirname(modularRoot);
    }

    logger.debug(`Located modular root ${modularRoot}`);
    return path.normalize(modularRoot);
  } catch (err) {
    throw new Error(err as string);
  }
}

export default memoize(getModularRoot);
