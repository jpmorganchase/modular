import {
  computeDescendantSet,
  computeAncestorSet,
  traverseWorkspaceRelations,
} from '@modular-scripts/workspace-resolver';

import { getAllWorkspaces } from './getAllWorkspaces';
import { getChangedWorkspacesContent } from './getChangedWorkspaces';
import getModularRoot from './getModularRoot';

/**
 * @typedef {Object} TargetOptions
 * @property {string[]} targets - An array of package names to select
 * @property {boolean} changed - Whether to additionally select packages that have changes, compared to "compareBranch"
 * @property {boolean} ancestors - Whether to additionally select packages that are ancestors of (i.e.: [in]directly depend on) the selected packages
 * @property {boolean} descendants - Whether to additionally select packages that descend from (i.e.: are [in]directly depended on by) the selected packages
 * @property {string?} compareBranch - The git branch to compare with when "changed"  is specified
 */

/**
 * Select target packages in workspaces, optionally including changed, ancestors and descendant packages
 * @param  {TargetOptions} name The target options to configure selection
 * @return {Promise<string[]>} A distinct list of selected package names
 */

interface TargetOptions {
  targets: string[];
  changed: boolean;
  ancestors: boolean;
  descendants: boolean;
  compareBranch?: string;
}

export async function selectWorkspaces({
  targets,
  changed,
  ancestors,
  descendants,
  compareBranch,
}: TargetOptions): Promise<string[]> {
  const [, allWorkspacesMap] = await getAllWorkspaces(getModularRoot());
  let changedTargets: string[] = [];

  if (changed) {
    const [, buildTargetMap] = await getChangedWorkspacesContent(compareBranch);
    changedTargets = Object.keys(buildTargetMap);
  }

  const targetsToBuild = [...new Set(targets.concat(changedTargets))];

  if (!targetsToBuild.length) {
    return [];
  }

  // Calculate the package scope, i.e. the deduped array of all the packages we need to generate an ordering graph for.
  // We need to remember ancestor and descendant sets in order to select them later.
  let ancestorsSet: Set<string> = new Set();
  let descendantsSet: Set<string> = new Set();
  let packageScope = targetsToBuild;

  if (descendants) {
    descendantsSet = computeDescendantSet(targetsToBuild, allWorkspacesMap);
    packageScope = packageScope.concat([...descendantsSet]);
  }

  if (ancestors) {
    ancestorsSet = computeAncestorSet(targetsToBuild, allWorkspacesMap);
    packageScope = packageScope.concat([...ancestorsSet]);
  }

  packageScope = [...new Set(packageScope)];

  // traverseWorkspaceRelations will walk the graph and generate the whole ordering needed to build a package
  // which means that it will possibly expand the scope (it just generates the dependency order starting from a dependency subset but taking into account the whole dependency graph)
  // this means that we can build in order even manually selected subsets of packages (like: "the user wants to select only a and b, but execute tasks on them in order"),
  // but it also means we need to filter out all the unwanted packages later.
  const targetEntriesWithOrder = [
    ...traverseWorkspaceRelations(packageScope, allWorkspacesMap).entries(),
  ];

  return (
    targetEntriesWithOrder
      .sort((a, b) => b[1] - a[1])
      .map(([packageName]) => packageName)
      // Filter out descendants and ancestors if we don't explicitly need them.
      // This allows us to get the correct dependency order even if we restrict the scope (for example, by explicit user input).
      .filter(
        (packageName) =>
          (descendants && descendantsSet.has(packageName)) ||
          (ancestors && ancestorsSet.has(packageName)) ||
          targetsToBuild.includes(packageName),
      )
  );
}
