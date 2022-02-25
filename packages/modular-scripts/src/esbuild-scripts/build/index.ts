import * as esbuild from 'esbuild';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as minimize from 'html-minifier-terser';
import * as path from 'path';
import getClientEnvironment from '../config/getClientEnvironment';

import type { Paths } from '../../utils/createPaths';
import * as logger from '../../utils/logger';
import { formatError } from '../utils/formatError';

import { createIndex, getEntryPoint } from '../api';
import createEsbuildConfig from '../config/createEsbuildConfig';
import getModularRoot from '../../utils/getModularRoot';
import sanitizeMetafile from '../utils/sanitizeMetafile';
import { createRewriteDependenciesPlugin } from '../plugins/rewriteDependenciesPlugin';
import { indexFile, createViewTrampoline } from '../utils/createViewTrampoline';
import type { Dependency } from '@schemastore/package';
import createEsbuildBrowserslistTarget from '../../utils/createEsbuildBrowserslistTarget';

interface Metafile extends esbuild.Metafile {
  moduleEntryPoint?: string;
}

export default async function build(
  target: string,
  paths: Paths,
  externalDependencies: Dependency,
  type: 'app' | 'view',
) {
  const modularRoot = getModularRoot();
  const isApp = type === 'app';

  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  let result: Metafile;

  const browserTarget = createEsbuildBrowserslistTarget(paths.appPath);

  try {
    const buildResult = await esbuild.build(
      createEsbuildConfig(paths, {
        entryNames: 'static/js/[name]-[hash]',
        chunkNames: 'static/js/[name]-[hash]',
        assetNames: 'static/media/[name]-[hash]',
        target: browserTarget,
        plugins: isApp
          ? undefined
          : [createRewriteDependenciesPlugin(externalDependencies)],
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

  const html = await createIndex(
    paths,
    result,
    env.raw,
    false,
    isApp ? undefined : indexFile,
  );
  await fs.writeFile(
    path.join(paths.appBuild, 'index.html'),
    await minimize.minify(html, {
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

  if (!isApp) {
    // Include js entry point in the result
    result.moduleEntryPoint = getEntryPoint(paths, result, '.js');
    // Create and write trampoline file
    if (!result.moduleEntryPoint) {
      throw new Error("Can't find main entrypoint after building");
    }
    const trampolineBuildResult = await createViewTrampoline(
      path.basename(result.moduleEntryPoint),
      paths.appSrc,
      externalDependencies,
      browserTarget,
    );
    const trampolinePath = `${paths.appBuild}/static/js/_trampoline.js`;
    await fs.writeFile(
      trampolinePath,
      trampolineBuildResult.outputFiles[0].contents,
    );
  }

  return result;
}
