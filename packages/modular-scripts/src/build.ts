import { paramCase as toParamCase } from 'change-case';
import * as fs from 'fs-extra';
import * as path from 'path';

import { outputDirectory } from './config';
import getModularRoot from './utils/getModularRoot';
import actionPreflightCheck from './utils/actionPreflightCheck';
import isModularType from './utils/isModularType';
import execSync from './utils/execSync';
import getLocation from './utils/getLocation';

async function build(target: string, preserveModules?: boolean): Promise<void> {
  const modularRoot = getModularRoot();
  const targetPath = await getLocation(target);

  if (isModularType(targetPath, 'app')) {
    const buildScript = require.resolve(
      'modular-scripts/react-scripts/scripts/build.js',
    );

    const targetName = toParamCase(target);

    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(path.join(outputDirectory, targetName));

    // TODO: this shouldn't be sync
    execSync('node', [buildScript], {
      cwd: targetPath,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
        MODULAR_PACKAGE: target,
        MODULAR_PACKAGE_NAME: targetName,
      },
    });
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await buildPackage(target, preserveModules);
  }
}

export default actionPreflightCheck(build);
