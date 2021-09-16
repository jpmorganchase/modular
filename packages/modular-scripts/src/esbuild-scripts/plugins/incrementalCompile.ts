import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import { Plugin } from 'esbuild';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import { Paths } from '../../utils/createPaths';
import * as logger from '../../utils/logger';
import { InstructionURLS } from '../config/urls';

function createPlugin(
  paths: Paths,
  urls: InstructionURLS,
): {
  plugin: Plugin;
  initialBuildPromise: Promise<void>;
} {
  let resolve: () => void;
  const initialBuildPromise = new Promise<void>((r) => {
    resolve = r;
  });
  const plugin: Plugin = {
    name: 'incremental-logging',
    async setup(build) {
      let isFirstCompile = true;

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
        logger.log('Compiling...');
      });

      build.onEnd((result) => {
        const buildStartTime = buildCountMap.get(buildCounter);
        const buildTime = Number(new Date()) - Number(buildStartTime);

        logger.clear();
        const isSuccessful = !result.errors.length && !result.warnings.length;
        if (isSuccessful) {
          logger.log(
            `${chalk.green('Compiled successfully!')} ${chalk.dim(
              `[${buildTime}ms]`,
            )}`,
          );
        }

        if (isSuccessful && (process.stdout.isTTY || isFirstCompile)) {
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
          logger.log('Note that the development build is not optimized.');
          logger.log(
            `To create a production build, use ` +
              `${chalk.cyan(`yarn build`)}.`,
          );
          logger.log();
        }

        if (isFirstCompile) {
          resolve();
          isFirstCompile = false;
        }
      });
    },
  };

  return {
    plugin,
    initialBuildPromise,
  };
}

export default createPlugin;
