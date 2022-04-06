import isCi from 'is-ci';
import * as path from 'path';
import * as esbuild from 'esbuild';
import type { Paths } from '../../utils/createPaths';
import getClientEnvironment from './getClientEnvironment';
import createEsbuildBrowserslistTarget from '../../utils/createEsbuildBrowserslistTarget';
import * as logger from '../../utils/logger';

import moduleScopePlugin from '../plugins/moduleScopePlugin';
import svgrPlugin from '../plugins/svgr';
import workerFactoryPlugin from '../plugins/workerFactoryPlugin';

export default function createEsbuildConfig(
  paths: Paths,
  config: Partial<esbuild.BuildOptions> = {},
): esbuild.BuildOptions {
  const { plugins: configPlugins, ...partialConfig } = config;

  const plugins: esbuild.Plugin[] = [
    moduleScopePlugin(paths),
    svgrPlugin(),
    workerFactoryPlugin(),
  ].concat(configPlugins || []);

  const define = Object.assign(
    {},
    getClientEnvironment(paths.publicUrlOrPath).stringified,
    {
      global: 'window',
    },
  );

  const target = createEsbuildBrowserslistTarget(paths.appPath);

  logger.debug(`Using target: ${target.join(', ')}`);

  return {
    entryPoints: [paths.appIndexJs],
    plugins,
    bundle: true,
    resolveExtensions: paths.moduleFileExtensions.map(
      (extension) => `.${extension}`,
    ),
    sourcemap: true,
    loader: {
      // loaders for images which are supported as files
      '.avif': 'file',
      '.bmp': 'file',
      '.gif': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.png': 'file',
      '.webp': 'file',

      // font file format loaders
      '.woff': 'file',
      '.ttf': 'file',

      // enable JSX in js files
      '.js': 'jsx',
    },
    logLevel: 'silent',
    target,
    format: 'esm',
    color: !isCi,
    define,
    metafile: true,
    minify: true,
    outbase: paths.modularRoot,
    absWorkingDir: paths.modularRoot,
    outdir: paths.appBuild,
    publicPath: paths.publicUrlOrPath,
    nodePaths: (process.env.NODE_PATH || '').split(path.delimiter),
    ...partialConfig,
  };
}
