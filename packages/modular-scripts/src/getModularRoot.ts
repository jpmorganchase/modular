import * as path from 'path';
import findUp from 'find-up';

import isModularType from './isModularType';

function findUpModularRoot() {
  return findUp.sync((directory: string) => {
    const packageJsonPath = path.join(directory, 'package.json');
    if (
      findUp.sync.exists(packageJsonPath) &&
      isModularType(path.dirname(packageJsonPath), 'root')
    ) {
      return packageJsonPath;
    }
    return;
  });
}

let modularRoot: string | undefined;

export default function getModularRoot(): string {
  if (modularRoot) {
    return modularRoot;
  } else {
    try {
      modularRoot = findUpModularRoot();
      if (modularRoot === undefined) {
        console.error(
          'These commands must be run within a modular repository.',
        );
        process.exit(1);
      }

      modularRoot = path.dirname(modularRoot);
      return modularRoot;
    } catch (err) {
      console.error(err);
      return process.exit(1);
    }
  }
}
