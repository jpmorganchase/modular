import express from 'express';
import * as fs from 'fs-extra';

import actionPreflightCheck from './utils/actionPreflightCheck';
import createPaths from './utils/createPaths';
import getLocation from './utils/getLocation';
import * as logger from './utils/logger';
import isModularType from './utils/isModularType';

async function serve(target: string, port = 3000): Promise<void> {
  const targetLocation = await getLocation(target);

  if (isModularType(targetLocation, 'app')) {
    const paths = await createPaths(target);

    if (fs.existsSync(paths.appBuild)) {
      const app = express();
      app.use(express.static(paths.appBuild));
      app.listen(port, () => {
        logger.log(`Serving ${target} on ${port}`);
      });
    } else {
      throw new Error(
        `${target} has not been built. Run modular build ${target} before serving assets.`,
      );
    }
  } else {
    throw new Error(`Modular can only serve an app.`);
  }
}

export default actionPreflightCheck(serve);
