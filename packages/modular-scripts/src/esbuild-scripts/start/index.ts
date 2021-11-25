import * as esbuild from 'esbuild';
import chalk from 'chalk';
import * as express from 'express';
import ws from 'express-ws';
import * as fs from 'fs-extra';
import * as http from 'http';
import * as path from 'path';
import * as tmp from 'tmp';
import isCi from 'is-ci';
import type { ServeStaticOptions } from 'serve-static';

import memoize from '../../utils/memoize';

import createPaths, { Paths } from '../../utils/createPaths';
import getClientEnvironment, {
  ClientEnvironment,
} from '../config/getClientEnvironment';

import incrementalCompilePlugin from '../plugins/incrementalCompile';
import incrementalReporterPlugin from '../plugins/incrementalReporter';
import websocketReloadPlugin from '../plugins/wsReload';

import choosePort from '../utils/choosePort';
import openBrowser from '../utils/openBrowser';
import * as logger from '../../utils/logger';
import prepareUrls, { InstructionURLS } from '../config/urls';
import { createIndex } from '../api';
import { formatError } from '../utils/formatError';
import createEsbuildConfig from '../config/createEsbuildConfig';
import { createAbsoluteSourceMapMiddleware } from '../utils/absoluteSourceMapsMiddleware';
import createLaunchEditorMiddleware from '../../../react-dev-utils/errorOverlayMiddleware.js';

class DevServer {
  private paths: Paths;

  private express: express.Express;
  private server?: http.Server;
  private outdir: string;
  private started = false;

  private env: ClientEnvironment;
  private protocol: 'https' | 'http';

  private ws: ws.Instance;

  constructor(paths: Paths) {
    this.paths = paths;

    this.env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
    this.protocol = process.env.HTTPS === 'true' ? 'https' : 'http';

    this.outdir = tmp.dirSync().name;

    this.express = express.default();

    // Apply middleware to sourcemaps, to correct relative sources
    this.express.get(/\.map$/, createAbsoluteSourceMapMiddleware(this.outdir));

    this.ws = ws(this.express);

    const staticOptions: ServeStaticOptions = {
      cacheControl: false,
      index: false,
    };

    this.express.use(express.static(this.outdir, staticOptions));
    this.express.use(express.static(paths.appPublic, staticOptions));

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.express.get('/', this.handleIndex);

    this.express.use(createLaunchEditorMiddleware());

    this.ws.app.ws('/_ws', (ws, req) => {
      logger.debug('Connected');
    });
  }

  _host = memoize(() => {
    if (process.env.HOST) {
      logger.log(
        chalk.cyan(
          `Attempting to bind to HOST environment variable: ${chalk.yellow(
            chalk.bold(process.env.HOST),
          )}`,
        ),
      );
      logger.log(
        `If this was unintentional, check that you haven't mistakenly set it in your shell.`,
      );
      logger.log(
        `Learn more here: ${chalk.yellow('https://cra.link/advanced-config')}`,
      );
      logger.log();
    }
    return process.env.HOST || '0.0.0.0';
  });

  get host() {
    // wrap memoized version to prevent multiple logging calls.
    return this._host();
  }

  urls: () => Promise<InstructionURLS> = memoize(async () => {
    return prepareUrls(
      this.protocol,
      this.host,
      await this.port(),
      this.paths.publicUrlOrPath.slice(0, -1),
    );
  });

  private port: () => Promise<number> = memoize(async () => {
    const port = await choosePort(
      this.host,
      parseInt(process.env.PORT || '8000', 0),
    );
    if (port) {
      return port;
    } else {
      throw new Error(`Could not identify port to run against`);
    }
  });

  async start(): Promise<DevServer> {
    const port = await this.port();

    // force clearing the terminal when we start a dev server process
    // unless we're in CI because we'll want to keep all logs
    logger.clear();
    logger.debug(`Using ${this.outdir}`);
    logger.log(chalk.cyan('Starting the development server...\n'));

    // Start the esbuild before we startup the server
    await this.esbuildServer();
    await this.hostRuntime();

    return new Promise<DevServer>((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.server = this.express.listen(port, this.host, async () => {
          await openBrowser((await this.urls()).localUrlForBrowser);
          this.started = true;
          resolve(this);
        });
      } catch (err) {
        logger.error(err as string);
        reject(err);
      }
    });
  }

  shutdown = async () => {
    if (this.started) {
      this.server?.close();
      this.ws.getWss().close();
    }
    const esbuildServer = await this.esbuildServer();
    esbuildServer?.stop?.();
  };

  private hostRuntime = memoize(async () => {
    const runtimeDir = path.join(__dirname, '..', 'runtime');

    const runtimeDirFiles = await fs.readdir(runtimeDir);
    const indexFiles = runtimeDirFiles.filter(
      (p) =>
        p.startsWith('index') &&
        ['.js', '.ts'].some((extension) => p.endsWith(extension)),
    );
    if (indexFiles.length !== 1) {
      throw new Error(`Found multiple possible entry files`);
    }
    const entryPoint = indexFiles[0];

    try {
      return await esbuild.build({
        entryPoints: [path.join(runtimeDir, entryPoint)],
        bundle: true,
        resolveExtensions: this.paths.moduleFileExtensions.map(
          (extension) => `.${extension}`,
        ),
        sourcemap: 'inline',
        absWorkingDir: this.paths.appPath,
        format: 'esm',
        target: 'es2015',
        logLevel: 'silent',
        color: true,
        define: {
          global: 'window',
        },
        watch: true,
        plugins: [
          websocketReloadPlugin('runtime', this.ws.getWss(), this.paths),
        ],
        outbase: runtimeDir,
        outdir: path.join(this.outdir, '_runtime'),
        publicPath: (await this.urls()).localUrlForBrowser,
      });
    } catch (e) {
      const result = e as esbuild.BuildFailure;
      logger.log(chalk.red('Failed to compile runtime.\n'));
      const logs = result.errors.concat(result.warnings).map(async (m) => {
        logger.log(await formatError(m, this.paths.appPath));
      });

      await Promise.all(logs);

      throw new Error(`Failed to compile runtime`);
    }
  });

  private runEsbuild = async (watch: boolean) => {
    const plugins: esbuild.Plugin[] = [incrementalReporterPlugin(this.paths)];
    let resolveIntialBuild;
    if (watch) {
      const { plugin, initialBuildPromise } = incrementalCompilePlugin(
        this.paths,
        await this.urls(),
      );
      resolveIntialBuild = initialBuildPromise;
      plugins.push(plugin);
      plugins.push(websocketReloadPlugin('app', this.ws.getWss(), this.paths));
    } else {
      resolveIntialBuild = Promise.resolve();
    }

    const result = await esbuild.build(
      createEsbuildConfig(this.paths, {
        plugins,
        watch,
        metafile: true,
        incremental: watch,
        minify: false,
        outdir: this.outdir,
      }),
    );

    // wait for the initial build to complete
    await resolveIntialBuild;

    // return the result of the build
    return result;
  };

  private esbuildServer: () => Promise<esbuild.BuildResult> = memoize(
    async () => {
      await this.runEsbuild(false);
      // if the non-incremental succeeds then
      // we start a watching server
      return this.runEsbuild(true);
    },
  );

  handleIndex = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200);
    res.end(await createIndex(this.paths, this.env.raw, true));
  };
}

export default async function start(target: string): Promise<void> {
  const paths = await createPaths(target);
  const devServer = new DevServer(paths);

  const server = await devServer.start();

  ['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.on(sig, () => {
      void server.shutdown();
    });
  });

  if (!isCi) {
    // Gracefully exit when stdin ends
    process.stdin.on('end', () => {
      void server.shutdown();
    });
  }
}
