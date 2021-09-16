import * as esbuild from 'esbuild';
import isCi from 'is-ci';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as minimize from 'html-minifier-terser';
import * as path from 'path';
import getClientEnvironment from '../config/getClientEnvironment';

import { Paths } from '../../utils/createPaths';
import * as logger from '../../utils/logger';
import { formatError } from '../utils/formatError';

import svgrPlugin from '../plugins/svgr';
import { createIndex } from '../api';

const plugins: esbuild.Plugin[] = [svgrPlugin()];

export default async function build(target: string, paths: Paths) {
  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  const html = await createIndex(paths, env.raw, false);
  await fs.writeFile(
    path.join(paths.appBuild, 'index.html'),
    minimize.minify(html, {
      html5: true,
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      collapseInlineTagWhitespace: true,
      decodeEntities: true,
      minifyCSS: true,
      minifyJS: true,
      removeAttributeQuotes: true,
      removeComments: true,
      removeTagWhitespace: true,
    }),
  );

  try {
    await esbuild.build({
      entryPoints: [paths.appIndexJs],
      plugins,
      bundle: true,
      watch: false,
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
      define: getClientEnvironment(paths.publicUrlOrPath).stringified,
      metafile: true,
      tsconfig: paths.appTsConfig,
      minify: true,
      outbase: 'src',
      outdir: paths.appBuild,
      publicPath: paths.publicUrlOrPath,
      nodePaths: (process.env.NODE_PATH || '').split(path.delimiter),
    });
  } catch (e) {
    const result = e as esbuild.BuildFailure;
    logger.log(chalk.red('Failed to compile.\n'));
    const logs = result.errors.map(async (m) => {
      logger.log(await formatError(m));
    });

    await Promise.all(logs);

    throw new Error(`Failed to build ${target}`);
  }
}
