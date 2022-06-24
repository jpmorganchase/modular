import path from 'path';
import * as fs from 'fs-extra';
import * as minimize from 'html-minifier-terser';
import getClientEnvironment from '../esbuild-scripts/config/getClientEnvironment';
import {
  createSyntheticIndex,
  createViewTrampoline,
} from '../esbuild-scripts/api';
import { StandAloneBuilderContext } from './createBuilderContext';

export async function generateEsmViewTrampoline(
  context: StandAloneBuilderContext,
) {
  const { jsEntryPoint, paths, cssEntryPoint, dependencies, browserTarget } =
    context;

  if (!dependencies) {
    throw new Error(
      `generateEsmViewTrampoline: cannot run without a dependencies map`,
    );
  }

  if (!jsEntryPoint) {
    throw new Error(
      `generateEsmViewTrampoline: unable to process view, jsEntryPoint not found`,
    );
  }

  // Create synthetic index
  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
  const html = createSyntheticIndex({ cssEntryPoint, replacements: env.raw });
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

  // Create and write trampoline file
  const trampolineBuildResult = await createViewTrampoline(
    path.basename(jsEntryPoint),
    paths.appSrc,
    dependencies.externalDependencies,
    dependencies.externalResolutions,
    browserTarget,
  );
  const trampolinePath = `${paths.appBuild}/static/js/_trampoline.js`;
  await fs.writeFile(
    trampolinePath,
    trampolineBuildResult.outputFiles[0].contents,
  );
}
