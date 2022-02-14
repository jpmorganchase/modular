import { Plugin } from 'esbuild';
import chalk from 'chalk';
import * as logger from '../../../utils/logger';
import { formatError } from '../../utils/formatError';
import type { Paths } from '../../../utils/createPaths';

function createPlugin(paths: Paths): Plugin {
  const plugin: Plugin = {
    name: 'incremental-errors',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length) {
          logger.log(chalk.red('Failed to compile.\n'));
        } else {
          if (result.warnings.length) {
            logger.log(chalk.red('Compiled with warnings.\n'));
          }
        }

        // If errors exist, only show errors.
        if (result.errors.length) {
          await Promise.all(
            result.errors.map(async (m) => {
              logger.log(await formatError(m, paths.modularRoot));
            }),
          );
        }

        if (result.warnings.length) {
          await Promise.all(
            result.warnings.map(async (m) => {
              logger.log(await formatError(m, paths.modularRoot));
            }),
          );
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
