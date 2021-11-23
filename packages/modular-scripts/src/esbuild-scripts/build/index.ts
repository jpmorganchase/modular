import * as esbuild from 'esbuild';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as minimize from 'html-minifier-terser';
import * as path from 'path';
import getClientEnvironment from '../config/getClientEnvironment';

import type { Paths } from '../../utils/createPaths';
import * as logger from '../../utils/logger';
import { formatError } from '../utils/formatError';

import { createIndex } from '../api';
import createEsbuildConfig from '../config/createEsbuildConfig';

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
      removeAttributeQuotes: false,
      removeComments: true,
      removeTagWhitespace: true,
    }),
  );

  try {
    return esbuild.build(createEsbuildConfig(paths));
  } catch (e) {
    const result = e as esbuild.BuildFailure;
    logger.log(chalk.red('Failed to compile.\n'));
    const logs = result.errors.map(async (m) => {
      logger.log(await formatError(m, paths.appPath));
    });

    await Promise.all(logs);

    throw new Error(`Failed to build ${target}`);
  }
}
