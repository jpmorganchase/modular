import * as path from 'path';
import isCi from 'is-ci';
import * as esbuild from 'esbuild';
import builtinModules from 'builtin-modules';
import getClientEnvironment from '../../common-scripts/getClientEnvironment';
import * as logger from '../../../utils/logger';
import moduleScopePlugin from '../plugins/moduleScopePlugin';
import svgrPlugin from '../plugins/svgr';
import workerFactoryPlugin from '../plugins/workerFactoryPlugin';
import { getConfig } from '../../../utils/config';
import type { Paths } from '../../common-scripts/determineTargetPaths';

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

  logger.debug(
    `Using target: ${(partialConfig.target as string[]).join(', ')}`,
  );

  // merge and de-duplicate node builtins with external in the parameters
  const external = [
    ...new Set((partialConfig.external ?? []).concat(builtinModules)),
  ];

  return {
    entryPoints: [paths.appIndexJs],
    plugins,
    bundle: true,
    resolveExtensions: paths.moduleFileExtensions.map(
      (extension) => `.${extension}`,
    ),
    sourcemap: getConfig('generateSourceMap', paths.appPath),
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
    target: partialConfig.target,
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
    // this was merged previously; do not override.
    external,
  };
}
