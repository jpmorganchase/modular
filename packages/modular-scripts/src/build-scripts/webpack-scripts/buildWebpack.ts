import isCi from 'is-ci';
import chalk from 'chalk';
import webpack from 'webpack';
import formatWebpackMessages from './utils/formatWebpackMessages';
import printBuildError from './utils/printBuildError';
import { log } from '../../utils/logger';
import {
  Compiler,
  Stats,
  StatsCompilation,
  WebpackConfiguration,
} from 'webpack-dev-server';
import { Paths } from '../common-scripts/determineTargetPaths';
import getConfig from './config/webpack.config';

export default async function buildWebpack(
  esbuildTargetFactory: string[],
  isApp: boolean,
  dependencyMap: Map<string, string>,
  useReactCreateRoot: boolean,
  styleImports: Set<string>,
  paths: Paths,
): Promise<StatsCompilation> {
  const webpackConfig: WebpackConfiguration = await getConfig(
    true,
    esbuildTargetFactory,
    isApp,
    dependencyMap,
    useReactCreateRoot,
    styleImports,
    paths,
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const compiler: Compiler = webpack(webpackConfig) as Compiler;
  return await runCompiler(compiler);
}

async function runCompiler(compiler: Compiler): Promise<StatsCompilation> {
  return new Promise((resolve, reject) => {
    compiler.run((err: Error | null | undefined, stats: Stats | undefined) => {
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
        statsJson = stats.toJson();
        messages = formatWebpackMessages({
          errors: statsJson.errors,
          warnings: statsJson.warnings,
        });
      }
      if (messages && messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        printBuildError(new Error(messages.errors[0]));
        reject();
      }
      if (isCi && messages && messages.warnings.length) {
        log(
          chalk.yellow(
            'Treating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );
        printBuildError(new Error(messages.warnings.join('\n\n')));
        reject();
      }
      statsJson ? resolve(statsJson) : reject();
    });
  });
}
