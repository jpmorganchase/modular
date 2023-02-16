import isCi from 'is-ci';
import chalk from 'chalk';
import fs from 'fs-extra';
import webpack from 'webpack';
import getConfig from '../config/webpack.config';
import formatWebpackMessages from '../../react-dev-utils/formatWebpackMessages';
import printBuildError from '../../react-dev-utils/printBuildError';
import { log } from '../../react-dev-utils/logger';
import { Paths } from '../../utils/determineTargetPaths';
import { WebpackConfiguration } from 'webpack-dev-server';

export default async function buildWebpack(
  targetPath: string,
  esbuildTargetFactory: string[],
  isApp: boolean,
  dependencyMap: Map<string, string>,
  useReactCreateRoot: boolean,
  styleImports: Set<string>,
  paths: Paths,
) {
  // Makes the script crash on unhandled rejections instead of silently
  // ignoring them. In the future, promise rejections that are not handled will
  // terminate the Node.js process with a non-zero exit code.
  process.on('unhandledRejection', (err) => {
    throw err;
  });

  const webpackConfig: WebpackConfiguration = getConfig(
    true,
    esbuildTargetFactory,
    isApp,
    dependencyMap,
    useReactCreateRoot,
    styleImports,
    paths,
  );
  const compiler = webpack(webpackConfig);
  await runCompiler(compiler, paths);
}

async function runCompiler(
  compiler: webpack.Compiler,
  paths: Paths,
): Promise<void> {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      log('Webpack Compiled.');
      let messages;
      let statsJson;
      if (err) {
        if (!err.message) {
          printBuildError(err);
          process.exit(1);
        }

        messages = formatWebpackMessages({
          errors: [err.message],
          warnings: [],
        });
      } else if (stats) {
        statsJson = stats.toJson({
          all: false,
          assets: true,
          warnings: true,
          errors: true,
        });
        messages = formatWebpackMessages({
          errors: statsJson.errors,
          warnings: statsJson.warnings,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (messages && messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        printBuildError(new Error(messages.errors[0]));
        reject();
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (isCi && messages && messages.warnings.length) {
        log(
          chalk.yellow(
            'Treating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        printBuildError(new Error(messages.warnings.join('\n\n')));
        reject();
      }

      try {
        fs.writeJsonSync(`${paths.appBuild}/bundle-stats.json`, statsJson);
        resolve();
      } catch (error) {
        printBuildError(error);
        reject();
      }
    });
  });
}
