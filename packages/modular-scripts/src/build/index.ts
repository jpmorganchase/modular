import actionPreflightCheck from '../utils/actionPreflightCheck';
import { getModularType, ModularType } from '../utils/isModularType';
import getLocation from '../utils/getLocation';
import { setupEnvForDirectory } from '../utils/setupEnv';
import { createBuilderContext } from './createBuilderContext';
import { getBuildTool, getStandAloneLifecycle } from './standAloneBuilder';

// Add dependencies from source and bundled dependencies to target package.json

async function buildStandalone(
  target: string,
  type: Extract<ModularType, 'app' | 'esm-view'>,
) {
  const lifecycle = await getStandAloneLifecycle();
  await lifecycle.run(await createBuilderContext(target, getBuildTool(), type));
}

async function build(
  target: string,
  preserveModules = true,
  includePrivate = false,
): Promise<void> {
  const targetDirectory = await getLocation(target);

  setupEnvForDirectory(targetDirectory);

  const targetType = getModularType(targetDirectory);
  if (targetType === 'app' || targetType === 'esm-view') {
    return buildStandalone(target, targetType);
  }

  // ^ we do a dynamic import here to defer the module's initial side effects
  // till when it's actually needed (i.e. now)
  const { buildPackage } = await import('./buildPackage');
  await buildPackage(target, preserveModules, includePrivate);
}

export default actionPreflightCheck(build);
