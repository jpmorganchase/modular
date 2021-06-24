import * as path from 'path';
import * as fs from 'fs-extra';
import findUp from 'find-up';
import memoize from './memoize';

function isModularRoot(packageJson: { modular?: Record<string, unknown> }) {
  return packageJson?.modular?.type === 'root';
}

function findUpModularRoot() {
  return findUp.sync((directory: string) => {
    const packageJsonPath = path.join(directory, 'package.json');
    if (
      findUp.sync.exists(packageJsonPath) &&
      isModularRoot(fs.readJsonSync(packageJsonPath))
    ) {
      return packageJsonPath;
    }
    return;
  });
}

function getModularRoot(): string {
  try {
    const modularRoot = findUpModularRoot();
    if (modularRoot === undefined) {
      throw new Error(
        'These commands must be run within a modular repository.',
      );
    }

    return path.dirname(modularRoot);
  } catch (err) {
    throw new Error(err);
  }
}

export default memoize(getModularRoot);
