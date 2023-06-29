import express from 'express';
import * as fs from 'fs-extra';
import cors from 'cors';
import determineTargetPaths from './build-scripts/common-scripts/determineTargetPaths';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getWorkspaceLocation from './utils/getLocation';
import * as logger from './utils/logger';
import { isModularType } from './utils/packageTypes';

async function serve(target: string, port = 3000): Promise<void> {
  const targetPath = await getWorkspaceLocation(target);

  if (
    isModularType(targetPath, 'app') ||
    isModularType(targetPath, 'esm-view')
  ) {
    const paths = determineTargetPaths(target, targetPath);

    if (fs.existsSync(paths.appBuild)) {
      const app = express();
      app.use(cors());
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
    throw new Error(`Modular can only serve an app or an esm-view.`);
  }
}

export default actionPreflightCheck(serve);
