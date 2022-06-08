import micromatch from 'micromatch';
import * as logger from './logger';
import type { Dependency } from '@schemastore/package';
import type { WorkspaceInfo } from './getWorkspaceInfo';

interface FilteredDependencies {
  external: Dependency;
  bundled: Dependency;
}

// Filter out dependencies that are in blocklist
export function filterDependencies({
  dependencies,
  isApp,
  workspaceInfo,
}: {
  dependencies: Dependency;
  isApp: boolean;
  workspaceInfo: WorkspaceInfo;
}): FilteredDependencies {
  if (isApp) {
    return {
      bundled: dependencies,
      external: {},
    };
  }

  const externalBlockList =
    process.env.EXTERNAL_BLOCK_LIST && !isApp
      ? process.env.EXTERNAL_BLOCK_LIST.split(',')
      : undefined;

  const externalAllowList =
    process.env.EXTERNAL_ALLOW_LIST && !isApp
      ? process.env.EXTERNAL_ALLOW_LIST.split(',')
      : undefined;

  return partitionDependencies({
    dependencies,
    allowList: externalAllowList,
    blockList: externalBlockList,
    workspaceInfo,
  });
}

export function partitionDependencies({
  dependencies,
  workspaceInfo,
  // By default, everything is externalized
  allowList: externalizeList = ['**'],
  // By default, nothing is bundled
  blockList: bundleList = [],
}: {
  dependencies: Dependency;
  allowList?: string[];
  blockList?: string[];
  workspaceInfo: WorkspaceInfo;
}): FilteredDependencies {
  logger.debug('Filtering dependencies...');
  logger.debug(
    `External block list for dependencies is: ${JSON.stringify(
      externalizeList,
    )}`,
  );
  logger.debug(
    `External allow list for dependencies is: ${JSON.stringify(bundleList)}`,
  );

  return Object.entries(dependencies).reduce<FilteredDependencies>(
    (acc, [name, version]) => {
      const isBlocked = micromatch.isMatch(name, bundleList);
      const isAllowed = micromatch.isMatch(name, externalizeList);
      // Workspace dependencies should always be declared as either wildcard or exact dependencies in package.json
      const workspaceVersion = workspaceInfo?.[name]?.version;
      const isWorkspaceDependency =
        workspaceVersion === version || workspaceVersion === '*';

      // Rules:
      // - All workspace dependencies that match version are bundled
      // - All blocked versions are bundled
      // - All not allowed versions are bundled
      const isExternal = isAllowed && !isBlocked && !isWorkspaceDependency;

      logger.debug(
        `Dependency ${name} isBlocked:${isBlocked.toString()}, isAllowed: ${isAllowed.toString()}, isWorkspaceDependency: ${isWorkspaceDependency.toString()}. Will be rewritten -> ${isExternal.toString()}`,
      );

      if (isExternal) {
        acc.external[name] = version;
      } else {
        acc.bundled[name] = version;
      }
      return acc;
    },
    {
      external: {},
      bundled: {},
    },
  );
}
