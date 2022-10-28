import { checkType } from './plugins/check-type';
import { esbuildMeasureFileSizes } from './plugins/esbuild-measure-file-size';
import { checkBrowsers } from './plugins/check-browsers';
import type { ModularBuildConfig, ModularBuildContext } from './types';
import { createWorkflow } from './workflow';

export function buildStandalone(
  config: ModularBuildConfig,
  env: Record<string, string>,
) {
  const workflow = createBuilder(config, env);
  return workflow.execute({} as any);
}

function createBuilder(
  config: ModularBuildConfig,
  env: Record<string, string>,
) {
  const isEsbuild =
    env.USE_MODULAR_ESBUILD === 'true' || env.USE_MODULAR_WEBPACK === 'false';

  return isEsbuild
    ? esbuildWorkflow(config)
    : createWorkflow(...webpackBuilder());
}

function esbuildWorkflow(config: ModularBuildConfig) {
  return createWorkflow<ModularBuildContext>(
    checkType(config, 'app', 'esm-view'),
    checkBrowsers(config),
    esbuildMeasureFileSizes(config),
  );
}

function webpackBuilder() {
  return [];
}
