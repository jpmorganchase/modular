import * as esbuild from 'esbuild';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';

import * as logger from '../../../utils/logger';
import { formatError } from '../utils/formatError';

import createEsbuildConfig from '../config/createEsbuildConfig';
import getModularRoot from '../../../utils/getModularRoot';
import sanitizeMetafile from '../utils/sanitizeMetafile';
import { createRewriteDependenciesPlugin } from '../plugins/rewriteDependenciesPlugin';
import createEsbuildBrowserslistTarget from '../../common-scripts/createEsbuildBrowserslistTarget';
import type { Paths } from '../../common-scripts/determineTargetPaths';
import { ImportInfo } from '../../../utils/importInfo';

export default async function build(
  target: string,
  paths: Paths,
  importInfo: ImportInfo,
  type: 'app' | 'esm-view',
) {
  const modularRoot = getModularRoot();
  const isApp = type === 'app';

  let result: esbuild.Metafile;

  const browserTarget = createEsbuildBrowserslistTarget(paths.appPath);

  let plugins;
  if (!isApp && importInfo) {
    plugins = [createRewriteDependenciesPlugin(importInfo)];
  }

  try {
    const buildResult = await esbuild.build(
      createEsbuildConfig(paths, {
        entryNames: 'static/js/[name]-[hash]',
        chunkNames: 'static/js/[name]-[hash]',
        assetNames: 'static/media/[name]-[hash]',
        target: browserTarget,
        plugins,
      }),
    );

    result = sanitizeMetafile(paths, buildResult.metafile as esbuild.Metafile);
  } catch (e) {
    const result = e as esbuild.BuildFailure;
    logger.log(chalk.red('Failed to compile.\n'));
    const logs = result.errors.map(async (m) => {
      logger.log(await formatError(m, paths.modularRoot));
    });

    await Promise.all(logs);

    throw new Error(`Failed to build ${target}`);
  }

  // move CSS files to their real location on disk...
  for (const outputFileName of Object.keys(result.outputs)) {
    if (['.css', '.css.map'].some((ext) => outputFileName.endsWith(ext))) {
      const cssFileToMove = outputFileName.replace('/css/', '/js/');
      logger.debug(`Moving css ${cssFileToMove} => ${outputFileName}`);
      await fs.move(
        path.join(modularRoot, cssFileToMove),
        path.join(modularRoot, outputFileName),
      );
    }
  }

  return result;
}
