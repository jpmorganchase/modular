import fs from 'fs';
import chalk from 'chalk';
import WebpackDevServer from 'webpack-dev-server';
import { log } from '../../utils/logger';
import type { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import isCI from 'is-ci';

import getConfig from './config/webpack.config';
import createDevServerConfig from './config/webpackDevServer.config';
import { readJSONSync } from 'fs-extra';
import { prepareProxy, createCompiler } from './utils/webpackDevServerUtils';
import { choosePort } from '../common-scripts/getPort';
import prepareUrls from '../common-scripts/urls';
import { Paths } from '../common-scripts/determineTargetPaths';
import openBrowser from '../common-scripts/openBrowser';

// Tools like Cloud9 rely on this.
const portEnv = process.env.PORT;
const DEFAULT_PORT = portEnv ? parseInt(portEnv, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

export default function startWebpack(
  esbuildTargetFactory: string[],
  isApp: boolean,
  dependencyMap: Map<string, string>,
  useReactCreateRoot: boolean,
  styleImports: Set<string>,
  paths: Paths,
) {
  if (process.env.HOST) {
    log(
      chalk.cyan(
        `Attempting to bind to HOST environment variable: ${chalk.yellow(
          chalk.bold(process.env.HOST),
        )}`,
      ),
    );
    log(
      `If this was unintentional, check that you haven't mistakenly set it in your shell.`,
    );
    log(`Learn more here: ${chalk.yellow('https://cra.link/advanced-config')}`);
    log();
  }

  choosePort(HOST, DEFAULT_PORT)
    .then(async (port: number | undefined) => {
      if (!port) {
        // We have not found a port.
        return;
      }

      const config = await getConfig(
        false,
        esbuildTargetFactory,
        isApp,
        dependencyMap,
        useReactCreateRoot,
        styleImports,
        paths,
      );
      // overload for webpack-dev-server@4
      config.stats = 'none';
      config.infrastructureLogging = {
        level: 'none',
      };

      const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
      const packageJson = readJSONSync(
        require.resolve(paths.appPackageJson),
      ) as PackageJson;
      const appName = packageJson.name;
      const useTypeScript = !isCI && fs.existsSync(paths.appTsConfig);
      const urls = prepareUrls(
        protocol,
        HOST,
        port,
        paths.publicUrlOrPath.slice(0, -1),
      );
      // Create a webpack compiler that is configured with custom messages.
      // Only run typecheck if not in CI env
      const compiler = createCompiler(appName, config, urls, useTypeScript);

      // Load proxy config
      const proxySetting = packageJson.proxy as unknown;
      const proxyConfig = prepareProxy(
        proxySetting,
        paths.appPublic,
        paths.publicUrlOrPath,
      );
      // Serve webpack assets generated by the compiler over a web server.
      const serverConfig = createDevServerConfig(
        port,
        proxyConfig,
        urls.lanUrlForConfig,
        paths,
      );
      const devServer = new WebpackDevServer(serverConfig, compiler);

      // Launch WebpackDevServer.
      log(chalk.cyan('Starting the development server...'));

      await devServer.start();

      void openBrowser(urls.localUrlForBrowser);

      ['SIGINT', 'SIGTERM'].forEach(function (sig) {
        process.on(sig, function () {
          devServer.close();
          return;
        });
      });

      // Gracefully exit when stdin ends
      process.stdin.on('end', function () {
        devServer.close();
        return;
      });
    })
    .catch((err: Error) => {
      if (err && err.message) {
        log(err.message);
      }
    });
}
