import browserslist from 'browserslist';
import chalk from 'chalk';
import { EOL } from 'os';

import type { WorkflowPlugin } from '../workflow';
import type { ModularBuildConfig } from '../types';

export function checkBrowsers<T>(
  config: ModularBuildConfig,
): WorkflowPlugin<T> {
  return {
    phase: 'validate',
    handler(context) {
      if (browserslist.loadConfig({ path: config.targetDirectory }) === null) {
        throw new Error(
          chalk.red('Modular requires that you specify targeted browsers.') +
            EOL +
            `Run ${chalk.blue('modular check --fix')} to autofix this.`,
        );
      }

      return context;
    },
  };
}
