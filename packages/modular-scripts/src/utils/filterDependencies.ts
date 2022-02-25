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
      : [];
  return Object.entries(packageDependencies).reduce<FilteredDependencies>(
    (acc, [name, version]) => {
      if (externalBlockList.includes(name)) {
        acc.bundled[name] = version;
      } else {
        acc.external[name] = version;
      }
      return acc;
    },
    {
      external: {},
      bundled: {},
    },
  );
}
