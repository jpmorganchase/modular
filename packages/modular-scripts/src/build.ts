import * as fs from 'fs-extra';
import * as lockfile from 'lockfile';
import * as path from 'path';

import { outputDirectory, packagesRoot } from './config';
import getModularRoot from './utils/getModularRoot';
import isModularType from './utils/isModularType';
import buildApp from './buildApp';

export default async function build(
  packagePath: string,
  preserveModules?: boolean,
): Promise<void> {
  const modularRoot = getModularRoot();

  if (isModularType(path.join(modularRoot, packagesRoot, packagePath), 'app')) {
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(path.join(outputDirectory, packagePath));
    await buildApp(path.join(modularRoot, packagesRoot, packagePath));

    await fs.move(
      path.join(packagesRoot, packagePath, 'build'),
      path.join(outputDirectory, packagePath),
    );
  } else {
    try {
      lockfile.lockSync(path.join(modularRoot, 'build.lock'));

      // it's a view/package, run a library build
      const { buildPackage } = await import('./buildPackage');
      // ^ we do a dynamic import here to defer the module's initial side effects
      // till when it's actually needed (i.e. now)
      await buildPackage(packagePath, preserveModules);
    } finally {
      lockfile.unlockSync(path.join(modularRoot, 'build.lock'));
    }
  }
}
