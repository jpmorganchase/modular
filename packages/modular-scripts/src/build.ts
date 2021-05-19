import * as fs from 'fs-extra';
import * as path from 'path';

import getModularRoot from './utils/getModularRoot';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import { cracoBin, outputDirectory, packagesRoot, cracoConfig } from './config';

export default async function build(
  packagePath: string,
  preserveModules?: boolean,
): Promise<void> {
  const modularRoot = getModularRoot();

  if (isModularType(path.join(modularRoot, packagesRoot, packagePath), 'app')) {
    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(path.join(outputDirectory, packagePath));
    // TODO: this shouldn't be sync
    execSync(cracoBin, ['build', '--config', cracoConfig], {
      cwd: path.join(modularRoot, packagesRoot, packagePath),
      log: false,
      // @ts-ignore
      env: {
        USE_MODULAR_BABEL: process.env.USE_MODULAR_BABEL,
        MODULAR_ROOT: modularRoot,
      },
    });

    await fs.move(
      path.join(packagesRoot, packagePath, 'build'),
      path.join(outputDirectory, packagePath),
    );
  } else {
    // it's a view/package, run a library build
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await buildPackage(packagePath, preserveModules);
  }
}
