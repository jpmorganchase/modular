import { buildStandalone } from './buildStandalone';
import { buildPackage } from './buildPackage';
import * as logger from '../utils/logger';
import getModularRoot from '../utils/getModularRoot';
import actionPreflightCheck from '../utils/actionPreflightCheck';
import { getModularType } from '../utils/packageTypes';
import execAsync from '../utils/execAsync';
import getWorkspaceLocation from '../utils/getLocation';
import { selectBuildableWorkspaces } from '../utils/selectWorkspaces';
import { setupEnvForDirectory } from '../utils/setupEnv';
import { getAllWorkspaces } from '../utils/getAllWorkspaces';

async function build({
  packagePaths,
  preserveModules = true,
  private: includePrivate,
  ancestors,
  descendants,
  changed,
  compareBranch,
  dangerouslyIgnoreCircularDependencies,
}: {
  packagePaths: string[];
  preserveModules: boolean;
  private: boolean;
  ancestors: boolean;
  descendants: boolean;
  changed: boolean;
  compareBranch?: string;
  dangerouslyIgnoreCircularDependencies: boolean;
}): Promise<void> {
  const isSelective =
    changed || ancestors || descendants || packagePaths.length;

  const modularRoot = getModularRoot();
  const [allWorkspacePackages] = await getAllWorkspaces(modularRoot);

  // targets are either the set of what's specified in the selective options or all the packages in the monorepo
  const targets = isSelective ? packagePaths : [...allWorkspacePackages.keys()];

  const selectedTargets = await selectBuildableWorkspaces({
    targets,
    changed,
    compareBranch,
    descendants,
    ancestors,
    dangerouslyIgnoreCircularDependencies,
  });

  if (!selectedTargets.length) {
    logger.log('No workspaces to build');
    process.exit(0);
  }

  logger.debug(
    `Building the following workspaces in order: ${JSON.stringify(
      selectedTargets,
    )}`,
  );

  for (const target of selectedTargets) {
    const packageInfo = allWorkspacePackages.get(target);

    try {
      const targetDirectory = await getWorkspaceLocation(target);
      await setupEnvForDirectory(targetDirectory);
      if (packageInfo?.modular) {
        // If it's modular, build with Modular
        const targetType = getModularType(targetDirectory);
        logger.log('\nBuilding', targetType!, target);

        if (targetType === 'app' || targetType === 'esm-view') {
          await buildStandalone(target, targetType);
        } else {
          await buildPackage(target, preserveModules, includePrivate);
        }
      } else {
        // Otherwise, build by running the workspace's build script
        // We're sure it's here because selectBuildableWorkspaces returns only buildable workspaces.
        logger.log('\nBuilding non-modular package', target);
        await execAsync(`yarn`, ['workspace', target, 'build'], {
          cwd: modularRoot,
          log: false,
        });
      }
    } catch (err) {
      logger.error(`building ${target} failed`);
      throw err;
    }
  }
}

export default actionPreflightCheck(build);
