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

  // By default, nothing is in blocklist
  const externalBlockList =
    process.env.EXTERNAL_BLOCK_LIST && !isApp
      ? process.env.EXTERNAL_BLOCK_LIST.split(',')
      : [];

  // By default, everything in allow list
  const externalAllowList =
    process.env.EXTERNAL_ALLOW_LIST && !isApp
      ? process.env.EXTERNAL_ALLOW_LIST.split(',')
      : ['**'];

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

  return Object.entries(packageDependencies).reduce<FilteredDependencies>(
    (acc, [name, version]) => {
      const isBlocked = micromatch.isMatch(name, externalBlockList);
      const isAllowed = micromatch.isMatch(name, externalAllowList);

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
