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

    // create-react-app doesn't support plain module outputs yet,
    // so --preserve-modules has no effect here
    await fs.remove(path.join(outputDirectory, target));

    // TODO: this shouldn't be sync
    execSync('node', [buildScript], {
      cwd: targetPath,
      log: false,
      // @ts-ignore
      env: {
        MODULAR_ROOT: modularRoot,
      },
    });

    await fs.move(
      path.join(targetPath, 'build'),
      path.join(outputDirectory, target),
    );
  } else {
    const { buildPackage } = await import('./buildPackage');
    // ^ we do a dynamic import here to defer the module's initial side effects
    // till when it's actually needed (i.e. now)
    await buildPackage(target, preserveModules);
  }
}

export default actionPreflightCheck(build);
