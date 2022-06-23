import { getEntryPoint } from '../esbuild-scripts/api';
import { createEsbuildAssets } from './esbuildFileSizeReporter';
import { StandAloneBuilderContext } from './createBuilderContext';

export async function generateAssetsWithEsbuild(
  context: StandAloneBuilderContext,
) {
  const { dependencies, modularRoot, paths, targetDirectory, type } = context;

  if (!dependencies) {
    throw new Error(
      `generateAssetsWithEsbuild: cannot run without a dependencies map`,
    );
  }

  if (type !== 'app' && type !== 'esm-view') {
    throw new Error(
      `generateAssetsWithEsbuild: cannot process package type "${type}"`,
    );
  }

  const { default: buildEsbuildApp } = await import('../esbuild-scripts/build');
  const result = await buildEsbuildApp(
    targetDirectory,
    paths,
    dependencies.externalDependencies,
    dependencies.externalResolutions,
    type,
  );

  context.jsEntryPoint = getEntryPoint(paths, result, '.js');
  context.cssEntryPoint = getEntryPoint(paths, result, '.css');
  context.assets = createEsbuildAssets(paths, result, modularRoot);
}
