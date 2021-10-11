import isCi from 'is-ci';
import * as path from 'path';
import * as esbuild from 'esbuild';
import { Paths } from '../../utils/createPaths';
import getClientEnvironment from './getClientEnvironment';
import svgrPlugin from '../plugins/svgr';

export default function createEsbuildConfig(
  paths: Paths,
  config: Partial<esbuild.BuildOptions> = {},
): esbuild.BuildOptions {
  const plugins: esbuild.Plugin[] = [svgrPlugin()];

  const define = Object.assign(
    {},
    getClientEnvironment(paths.publicUrlOrPath).stringified,
    {
      global: 'window',
    },
  );

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

      // enable JSX in js files
      '.js': 'jsx',
    },
    logLevel: 'silent',
    target: 'es2015',
    absWorkingDir: paths.appPath,
    format: 'esm',
    color: !isCi,
    define,
    metafile: true,
    tsconfig: paths.appTsConfig,
    minify: true,
    outbase: 'src',
    outdir: paths.appBuild,
    sourceRoot: paths.modularRoot,
    publicPath: paths.publicUrlOrPath,
    nodePaths: (process.env.NODE_PATH || '').split(path.delimiter),
    ...config,
  };
}
