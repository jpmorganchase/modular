import * as fs from 'fs-extra';
import * as path from 'path';

import { outputDirectory, packagesRoot, cracoConfig } from './config';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import { resolveAsBin } from './utils/resolve-as-bin';

async function build(
  packagePath: string,
  preserveModules?: boolean,
): Promise<void> {
  const modularRoot = getModularRoot();

  if (isModularType(path.join(modularRoot, packagesRoot, packagePath), 'app')) {
    const cracoBin = await resolveAsBin('@craco/craco');

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
        SKIP_PREFLIGHT_CHECK: 'true',
      },
    });

    await fs.move(
      path.join(packagesRoot, packagePath, 'build'),
      path.join(outputDirectory, packagePath),
    );
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await buildPackage(packagePath, preserveModules);
  }
}

export default actionPreflightCheck(build);
