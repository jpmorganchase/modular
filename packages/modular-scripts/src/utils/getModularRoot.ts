import * as path from 'path';
import * as fs from 'fs-extra';
import findUp from 'find-up';

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

export default function getModularRoot(): string {
  try {
    const modularRoot = findUpModularRoot();
    if (modularRoot === undefined) {
      console.error('These commands must be run within a modular repository.');
      process.exit(1);
    }
    const modularRootPath = path.dirname(modularRoot);

    // Exposing this to enable configurations to be constructed before a cli command is called,
    // given that we know at this point we are in modular root.
    process.env.MODULAR_ROOT = modularRootPath;

    return modularRootPath;
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
}
