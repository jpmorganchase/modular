import * as esbuild from 'esbuild';
import chalk from 'chalk';
import * as express from 'express';
import ws from 'express-ws';
import * as fs from 'fs-extra';
import * as http from 'http';
import * as path from 'path';
import { getType } from 'mime';
import isCi from 'is-ci';

import memoize from '../../utils/memoize';

import createPaths, { Paths } from '../../utils/createPaths';
import getClientEnvironment, {
  ClientEnvironment,
} from '../config/getClientEnvironment';

import incrementalCompilePlugin from './plugins/incrementalCompile';
import incrementalReporterPlugin from './plugins/incrementalReporter';
import websocketReloadPlugin from './plugins/wsReload';
import metafileReporterPlugin from './plugins/metafileReporter';
import firstCompilePlugin from './plugins/firstCompile';

import openBrowser from '../utils/openBrowser';
import * as logger from '../../utils/logger';
import prepareUrls, { InstructionURLS } from '../config/urls';
import { createIndex } from '../api';
import createEsbuildConfig from '../config/createEsbuildConfig';
import createLaunchEditorMiddleware from '../../../react-dev-utils/errorOverlayMiddleware.js';
import getHost from './utils/getHost';
import getPort from './utils/getPort';
import sanitizeMetafile, { sanitizeFileName } from '../utils/sanitizeMetafile';
import getModularRoot from '../../utils/getModularRoot';
import { createRewriteDependenciesPlugin } from '../plugins/rewriteDependenciesPlugin';
import createEsbuildBrowserslistTarget from '../../utils/createEsbuildBrowserslistTarget';
import { indexFile, createViewTrampoline } from '../utils/createViewTrampoline';
import type { Dependency } from '@schemastore/package';

const RUNTIME_DIR = path.join(__dirname, 'runtime');
class DevServer {
  private paths: Paths;

  private express: express.Express;
  private server?: http.Server;

  private env: ClientEnvironment;

  private ws: ws.Instance;

  private watching = false;
  private firstCompilePromise: Promise<void>;
  private firstCompilePromiseResolve!: (
    value: void | PromiseLike<void>,
  ) => void;

  private metafile!: esbuild.Metafile;

  private esbuild!: esbuild.BuildResult;
  private runtimeEsbuild!: esbuild.BuildResult;

  private host: string;
  private urls: InstructionURLS;
  private port: number;

  private isApp: boolean; // TODO maybe it's better to pass the type here
  private dependencies: Dependency;

  constructor(
    paths: Paths,
    urls: InstructionURLS,
    host: string,
    port: number,
    isApp: boolean,
    dependencies: Dependency,
  ) {
    this.paths = paths;
    this.urls = urls;
    this.host = host;
    this.port = port;
    this.isApp = isApp;
    this.dependencies = dependencies;

    this.firstCompilePromise = new Promise<void>((resolve) => {
      this.firstCompilePromiseResolve = resolve;
    });

    this.env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

    this.express = express.default();
    this.ws = ws(this.express);

    this.express.use(this.handleStaticAsset);
    this.isApp || // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.express.get('/static/js/_trampoline.js', this.handleTrampoline);
    this.express.use('/static/js', this.handleStaticAsset);
    this.express.use(this.handleRuntimeAsset);

    this.express.use(
      express.static(paths.appPublic, {
        cacheControl: false,
        index: false,
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.express.get('/', this.handleIndex);

    this.express.use(createLaunchEditorMiddleware());

    this.ws.app.ws('/_ws', (ws, req) => {
      logger.debug('Connected');
    });

    // This registers user provided middleware for proxy reasons
    if (fs.existsSync(paths.proxySetup)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
      require(paths.proxySetup)(this.express);
    }
  }

  async start(): Promise<DevServer> {
    // force clearing the terminal when we start a dev server process
    // unless we're in CI because we'll want to keep all logs
    logger.clear();
    logger.log(chalk.cyan('Starting the development server...\n'));

    // Start the esbuild before we startup the server
    await this.startEsbuildServer();
    await this.hostRuntime();

    return new Promise<DevServer>((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.server = this.express.listen(this.port, this.host, async () => {
          await openBrowser(this.urls.localUrlForBrowser);
          resolve(this);
        });
      } catch (err) {
        logger.error(err as string);
        reject(err);
      }
    });
  }

  shutdown = () => {
    this.esbuild?.stop?.();
    this.ws.getWss().close();
    this.server?.close();
    process.nextTick(() => {
      this.ws.getWss().clients.forEach((socket) => {
        socket.terminate();
      });
    });
  };

  private hostRuntime = memoize(async () => {
    const runtimeDirFiles = await fs.readdir(RUNTIME_DIR);
    const indexFiles = runtimeDirFiles.filter(
      (p) =>
        p.startsWith('index') &&
        ['.js', '.ts'].some((extension) => p.endsWith(extension)),
    );
    if (indexFiles.length !== 1) {
      throw new Error(`Found multiple possible entry files`);
    }
    const entryPoint = indexFiles[0];

    this.runtimeEsbuild = await esbuild.build({
      entryPoints: [path.join(RUNTIME_DIR, entryPoint)],
      bundle: true,
      format: 'esm',
      target: 'es2015',
      logLevel: 'silent',
      define: {
        global: 'window',
      },
      write: false,
      outbase: RUNTIME_DIR,
      absWorkingDir: getModularRoot(),
      outdir: path.join(RUNTIME_DIR, '_runtime'),
    });
  });

  baseEsbuildConfig = memoize(() => {
    const browserTarget = createEsbuildBrowserslistTarget(this.paths.appPath);
    return createEsbuildConfig(
      this.paths,
      {
        write: false,
        minify: false,
        entryNames: 'static/js/[name]',
        chunkNames: 'static/js/[name]',
        assetNames: 'static/media/[name]',
        target: browserTarget,
        plugins: this.isApp
          ? undefined
          : [createRewriteDependenciesPlugin(this.dependencies)],
      },
      this.isApp ? 'app' : 'view',
    );
  });

  private runEsbuild = async () => {
    return esbuild.build(this.baseEsbuildConfig());
  };

  private metafileCallback = (metafile: esbuild.Metafile) => {
    this.metafile = sanitizeMetafile(this.paths, metafile);
  };

  private firstCompilePluginCallback = () => {
    this.firstCompilePromiseResolve?.();
  };

  private watchEsbuild = async () => {
    const config = this.baseEsbuildConfig();

    config.plugins?.push(incrementalReporterPlugin(this.paths));
    config.plugins?.push(incrementalCompilePlugin(this.paths, this.urls));
    config.plugins?.push(
      websocketReloadPlugin('app', this.ws.getWss(), this.paths),
    );
    config.plugins?.push(metafileReporterPlugin(this.metafileCallback));
    config.plugins?.push(firstCompilePlugin(this.firstCompilePluginCallback));

    this.esbuild = await esbuild.build({
      ...config,
      incremental: true,
      watch: true,
    });
  };

  private startEsbuildServer: () => Promise<void> = async () => {
    if (!this.watching) {
      this.watching = true;
    }
    await this.runEsbuild();

    // if the non-incremental succeeds then
    // we start a watching server
    await this.watchEsbuild();

    return this.firstCompilePromise;
  };

  handleIndex = async (_: http.IncomingMessage, res: http.ServerResponse) => {
    // wait until the first watch compile is complete
    await this.firstCompilePromise;

    res.writeHead(200);
    if (this.isApp) {
      res.end(await createIndex(this.paths, this.metafile, this.env.raw, true));
    } else {
      res.end(
        await createIndex(
          this.paths,
          this.metafile,
          this.env.raw,
          true,
          indexFile,
        ),
      );
    }
  };

  handleTrampoline = async (
    _: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    res.setHeader('content-type', 'application/javascript');
    res.writeHead(200);
    const baseConfig = this.baseEsbuildConfig();
    const trampolineBuildResult = await createViewTrampoline(
      'index.js',
      this.paths.appSrc,
      this.dependencies,
      baseConfig.target as string[],
    );
    res.end(
      Buffer.from(
        trampolineBuildResult.outputFiles[0].contents.buffer,
      ).toString(),
    );
  };

  private serveEsbuild = (
    outputDirectory: string,
    url: string,
    result: esbuild.BuildResult,
    res: http.ServerResponse,
    next: express.NextFunction,
  ) => {
    const outputFiles = result.outputFiles || [];

    for (const file of outputFiles) {
      if (
        sanitizeFileName('/' + path.relative(outputDirectory, file.path)) ===
        url
      ) {
        const type = getType(url) as string;

        res.setHeader('Content-Type', type);

        res.writeHead(200);
        return res.end(file.text);
      }
    }

    next();
  };

  handleStaticAsset: express.RequestHandler = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: express.NextFunction,
  ) => {
    // wait until the first watch compile is complete
    await this.firstCompilePromise;

    this.serveEsbuild(
      this.baseEsbuildConfig().outdir as string,
      req.url as string,
      this.esbuild,
      res,
      next,
    );
  };

  handleRuntimeAsset: express.RequestHandler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: express.NextFunction,
  ) => {
    this.serveEsbuild(
      RUNTIME_DIR,
      req.url as string,
      this.runtimeEsbuild,
      res,
      next,
    );
  };
}

export default async function start(
  target: string,
  isApp: boolean,
  packageDependencies: Dependency,
): Promise<void> {
  const paths = await createPaths(target);
  const host = getHost();
  const port = await getPort(host);
  const urls = prepareUrls(
    process.env.HTTPS === 'true' ? 'https' : 'http',
    host,
    port,
    paths.publicUrlOrPath.slice(0, -1),
  );
  const devServer = new DevServer(
    paths,
    urls,
    host,
    port,
    isApp,
    packageDependencies,
  );

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
