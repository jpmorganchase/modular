import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { Plugin } from 'esbuild';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import type { Paths } from '../../../utils/createPaths';
import * as logger from '../../../utils/logger';
import { InstructionURLS } from '../../config/urls';

function createPlugin(paths: Paths, urls: InstructionURLS): Plugin {
  const plugin: Plugin = {
    name: 'incremental-logging',
    async setup(build) {
      const packageJsonText = await fs.readFile(paths.appPackageJson, {
        encoding: 'utf-8',
      });
      const packageJson = JSON.parse(packageJsonText) as PackageJson;
      const appName = packageJson.name;

      let buildCounter = 0;
      const buildCountMap = new Map<number, Date>();

      build.onStart(() => {
        buildCounter += 1;
        buildCountMap.set(buildCounter, new Date());
        logger.clear();
        logger.log(chalk.yellow('Compiling...'));
      });

      build.onEnd((result) => {
        const buildStartTime = buildCountMap.get(buildCounter);

        // clean up before we have a memory leak...
        buildCountMap.delete(buildCounter);

        const buildTime = Number(new Date()) - Number(buildStartTime);

        logger.clear();
        const isSuccessful = !result.errors.length && !result.warnings.length;
        if (isSuccessful) {
          logger.log(
            `${chalk.green('Compiled successfully!')} ${chalk.dim(
              `[${buildTime}ms]`,
            )}`,
          );

          logger.log();
          logger.log(`You can now view ${chalk.bold(appName)} in the browser.`);
          logger.log();

          if (urls.lanUrlForTerminal) {
            logger.log(
              `  ${chalk.bold('Local:')}            ${
                urls.localUrlForTerminal as string
              }`,
            );
            logger.log(
              `  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}`,
            );
          } else {
            logger.log(`  ${urls.localUrlForTerminal as string}`);
          }

          logger.log();
        }
      });
    },
  };

  return plugin;
}

export default createPlugin;
