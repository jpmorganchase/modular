import * as fs from 'fs-extra';
import checkRequiredFiles from '../utils/checkRequiredFiles';
import { envBool } from '../utils/env';
import { esbuildMeasureFileSizesBeforeBuild } from './esbuildFileSizeReporter';
import { webpackMeasureFileSizesBeforeBuild } from './webpackFileSizeReporter';
import {
  BuildTool,
  filterTool,
  filterType,
  StandAloneBuilderContext,
} from './createBuilderContext';
import { generateAssetsWithEsbuild } from './generateAssetsEsBuild';
import { generateAssetsWebpack } from './generateAssetsWebpack';
import { printFileSizesAfterBuild } from './fileSizeReporter';
import { printHostingInstructions } from './printHostingInstructions';
import { builderLifecycleExtractDependencies } from './dependencyManifest';
import { generateEsmViewTrampoline } from './generateEsmViewTrampoline';
import { generateTargetPackageJson } from './generateTargetPackageJson';
import { createLifecycle, TaskLifecycle } from '../utils/lifecycle';

export async function getStandAloneLifecycle(): Promise<
  TaskLifecycle<StandAloneBuilderContext>
> {
  const lifeCycle = createLifecycle<StandAloneBuilderContext>();

  lifeCycle.initialize(
    filterTool('esbuild', esbuildMeasureFileSizesBeforeBuild),
  );
  lifeCycle.initialize(
    filterTool('webpack', webpackMeasureFileSizesBeforeBuild),
  );

  lifeCycle.initialize(ensureRequiredFilesExist);
  lifeCycle.initialize(prepareBuildDir);
  lifeCycle.initialize(filterType('app', prepareAppPublicContent));

  lifeCycle.beforeGenerate(builderLifecycleExtractDependencies);

  lifeCycle.generate(filterTool('esbuild', generateAssetsWithEsbuild));
  lifeCycle.generate(filterTool('webpack', generateAssetsWebpack));

  lifeCycle.afterGenerate(filterType('esm-view', generateEsmViewTrampoline));
  lifeCycle.afterGenerate(generateTargetPackageJson);

  lifeCycle.finalize(printFileSizesAfterBuild);
  lifeCycle.finalize(printHostingInstructions);

  return lifeCycle;
}

export function getBuildTool(): BuildTool {
  const useWebpack = envBool(process.env.USE_MODULAR_WEBPACK, true);
  const useEsbuild = envBool(process.env.USE_MODULAR_ESBUILD, false);

  // If you want to use webpack then we'll always use webpack. But if you've indicated
  // you want esbuild - then we'll switch you to the new fancy world.
  return !useWebpack || useEsbuild ? 'esbuild' : 'webpack';
}

async function prepareBuildDir(context: StandAloneBuilderContext) {
  await fs.emptyDir(context.paths.appBuild);
}

async function ensureRequiredFilesExist(context: StandAloneBuilderContext) {
  await checkRequiredFiles([context.paths.appIndexJs]);
  if (context.type === 'app') {
    await checkRequiredFiles([context.paths.appHtml]);
  }
}

async function prepareAppPublicContent(context: StandAloneBuilderContext) {
  await fs.copy(context.paths.appPublic, context.paths.appBuild, {
    dereference: true,
    filter: (file) => file !== context.paths.appHtml,
    overwrite: true,
  });
}
