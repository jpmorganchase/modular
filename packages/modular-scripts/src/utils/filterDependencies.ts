import micromatch from 'micromatch';
import * as logger from './logger';
import type { Dependency } from '@schemastore/package';

interface FilteredDependencies {
  external: Dependency;
  bundled: Dependency;
}

// Filter out dependencies that are in blocklist
export function filterDependencies(
  packageDependencies: Dependency,
  isApp: boolean,
): FilteredDependencies {
  if (isApp) {
    return {
      bundled: packageDependencies,
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

  logger.debug('Filtering dependencies...');
  logger.debug(
    `External block list for dependencies is: ${JSON.stringify(
      externalBlockList,
    )}`,
  );
  logger.debug(
    `External allow list for dependencies is: ${JSON.stringify(
      externalAllowList,
    )}`,
  );

  return matchDependencies({
    packageDependencies,
    allowList: externalAllowList,
    blockList: externalBlockList,
  });
}

export function matchDependencies({
  packageDependencies,
  // By default, everything in allow list
  allowList = ['**'],
  // By default, nothing is in blocklist
  blockList = [],
}: {
  packageDependencies: Dependency;
  allowList?: string[];
  blockList?: string[];
}): FilteredDependencies {
  return Object.entries(packageDependencies).reduce<FilteredDependencies>(
    (acc, [name, version]) => {
      const isBlocked = micromatch.isMatch(name, blockList);
      const isAllowed = micromatch.isMatch(name, allowList);

      logger.debug(
        `Dependency ${name} isBlocked:${isBlocked.toString()}, isAllowed: ${isAllowed.toString()}`,
      );

      // It's not enough to be in allow list, the dependency should also not be in block list to be rewritten
      if (isAllowed && !isBlocked) {
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
