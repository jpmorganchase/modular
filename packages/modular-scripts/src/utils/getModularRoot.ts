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
      console.error('These commands must be run within a modular repository.');
      process.exit(1);
    }

    return path.dirname(modularRoot);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
}

export default memoize(getModularRoot);
