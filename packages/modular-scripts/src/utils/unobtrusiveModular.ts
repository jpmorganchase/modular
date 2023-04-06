import type { ModularWorkspacePackage } from '@modular-scripts/modular-types';
import { getAllWorkspaces } from './getAllWorkspaces';
import getModularRoot from './getModularRoot';
// Utilities for handling non-modular packages

/**
 * From a list of package names, discard packages that don't have the required script
 * and partition the remaining packages into two lists of, respectively, Modular and non-Modular workspaces.
 * @param targets list of package names that we want to partition
 * @param workspaceMap the workspace map as returned from getAllWorkspaces
 * @param script the required scripts for non-modular packages
 */
export function partitionPackages(
  targets: string[],
  workspaceMap: Map<string, ModularWorkspacePackage>,
  script: string,
) {
  // Split testable packages into modular and non-modular
  return targets.reduce<[string[], string[]]>(
    ([testableModularTargetList, nonModularTargetList], current) => {
      const currentPackageInfo = workspaceMap.get(current);
      if (
        currentPackageInfo?.modular &&
        currentPackageInfo.modular.type !== 'root'
      ) {
        testableModularTargetList.push(currentPackageInfo.name);
      } else if (
        !currentPackageInfo?.modular &&
        currentPackageInfo?.rawPackageJson.scripts?.[script]
      ) {
        nonModularTargetList.push(currentPackageInfo.name);
      }

      return [testableModularTargetList, nonModularTargetList];
    },
    [[], []],
  );
}

export async function computeRegexesFromPackageNames(
  targets: string[],
): Promise<string[]> {
  const allWorkspaces = await getAllWorkspaces(getModularRoot());
  return targets
    .filter((packageName) => allWorkspaces[0].get(packageName)?.type)
    .map((packageName) => allWorkspaces[0].get(packageName)?.location)
    .filter(Boolean) as string[];
}
