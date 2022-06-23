import type { Dependency } from '@schemastore/package';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';
import { getPackageDependencies } from '../utils/getPackageDependencies';
import { filterDependencies } from '../utils/filterDependencies';
import { StandAloneBuilderContext } from './createBuilderContext';

export interface DependencyManifest {
  externalDependencies: Dependency;
  packageDependencies: Dependency;
  bundledResolutions: Dependency;
  bundledDependencies: Dependency;
  externalResolutions: Dependency;
}

export async function builderLifecycleExtractDependencies(
  context: StandAloneBuilderContext,
) {
  const dependencies = (context.dependencies = await extractDependencies(
    context.targetDirectory,
    context.type === 'app',
  ));

  context.debug(
    `These are the external dependencies and their resolutions: ${JSON.stringify(
      {
        externalDependencies: dependencies.externalDependencies,
        externalResolutions: dependencies.externalResolutions,
      },
    )}`,
  );

  context.debug(
    `These are the bundled dependencies and their resolutions: ${JSON.stringify(
      {
        bundledDependencies: dependencies.bundledDependencies,
        bundledResolutions: dependencies.bundledResolutions,
      },
    )}`,
  );
}

async function extractDependencies(
  target: string,
  isApp: boolean,
): Promise<DependencyManifest> {
  // Get workspace info to automatically bundle workspace dependencies
  const workspaceInfo = await getWorkspaceInfo();

  const { manifest, resolutions } = await getPackageDependencies(target);

  // Split dependencies between external and bundled
  const { external: externalDependencies, bundled: bundledDependencies } =
    filterDependencies({
      dependencies: manifest,
      isApp,
      workspaceInfo,
    });
  const { external: externalResolutions, bundled: bundledResolutions } =
    filterDependencies({
      dependencies: resolutions,
      isApp,
      workspaceInfo,
    });

  return {
    packageDependencies: manifest,
    externalDependencies,
    bundledDependencies,
    externalResolutions,
    bundledResolutions,
  };
}
