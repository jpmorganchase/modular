import {
  computeDescendantSet,
  computeAncestorSet,
  traverseWorkspaceRelations,
} from '@modular-scripts/workspace-resolver';
import { isBuildable } from './packageTypes';
import { getAllWorkspaces } from './getAllWorkspaces';
import { getChangedWorkspacesContent } from './getChangedWorkspaces';
import getModularRoot from './getModularRoot';
import { PackageType } from '@modular-scripts/modular-types';

/**
 * @typedef {Object} TargetOptions
 * @property {string[]} targets - An array of package names to select
 * @property {boolean} changed - Whether to additionally select packages that have changes, compared to "compareBranch"
 * @property {boolean} ancestors - Whether to additionally select packages that are ancestors of (i.e.: [in]directly depend on) the selected packages
 * @property {boolean} descendants - Whether to additionally select packages that descend from (i.e.: are [in]directly depended on by) the selected packages
 * @property {string?} compareBranch - The git branch to compare with when "changed"  is specified
 * @property {boolean} buildOrder - Select packages in build order
 */

/**
 * Select target packages in workspaces, optionally including changed, ancestors and descendant packages
 *
 *  Please note that the build order algorithm can't calculate build order if there's a cycle in the dependency graph,
 *  so circular dependencies will throw unless they only involve packages that don't get built (i.e. "source" `modular.type`s).
 *  Please also note that circular dependencies can always be fixed by creating an additional package that contains the common parts,
 *  and that they are considered a code smell + a source of many issues (e.g. https://nodejs.org/api/modules.html#modules_cycles)
 *  and they make your code fragile towards refactoring, so please don't introduce them in your monorepository.
 *
 * @param  {TargetOptions} name The target options to configure selection
 * @return {Promise<string[]>} A distinct list of selected package names
 */

interface TargetOptions {
  targets: string[];
  changed: boolean;
  ancestors: boolean;
  descendants: boolean;
  compareBranch?: string;
  buildOrder: boolean;
}

export async function selectWorkspaces({
  targets,
  changed,
  ancestors,
  descendants,
  compareBranch,
  buildOrder,
}: TargetOptions): Promise<string[]> {
  const [allWorkspacePackages, allWorkspacesMap] = await getAllWorkspaces(
    getModularRoot(),
  );
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

  // We want to remove all the non-buildable packages from the package scope. Create a filter predicate that looks up to the package map
  const isWorkspaceBuildable = (name: string) => {
    const type = allWorkspacePackages.get(name)?.modular?.type;
    return type && isBuildable(type as PackageType);
  };

  packageScope = [...new Set(packageScope)].filter(isWorkspaceBuildable);

  if (!buildOrder) return packageScope;

  // Since buildOrder is true, we want to select packages in build order. The build order algorithm gives up if there's a cycle in the dependency graph
  // (since it can't know what to build first if A depends on B but B depends on A), so we can allow cycles only if they involve packages that are not built
  // (i.e. "source" `modular.type`s). Please note that dependency cycles can always be fixed by creating an additional package that contains the common parts,
  // and that circular dependencies are a source of many additional issues.

  // The package graph is reduced to a graph where all vertices are buildable.
  // To do that, we need to first filter the vertices, then filter the edges that might be pointing to a non-buildable vertex
  const buildableWorkspacesMap = Object.fromEntries(
    Object.entries(allWorkspacesMap)
      .filter(([name]) => isWorkspaceBuildable(name))
      .map(([name, workspace]) => {
        return [
          name,
          {
            ...workspace,
            workspaceDependencies:
              workspace.workspaceDependencies.filter(isWorkspaceBuildable),
          },
        ];
      }),
  );

  // traverseWorkspaceRelations will walk the given graph (in this case, the graph of all buildable packages) and generate the whole ordering needed to build a package
  // which means that it will possibly expand the scope (it just generates the dependency order starting from a dependency subset but taking into account the whole dependency graph)
  // this means that we can generate an order from any strict subset of packages, but we need to filter out all the unwanted packages later.
  const targetEntriesWithOrder = [
    ...traverseWorkspaceRelations(
      packageScope,
      buildableWorkspacesMap,
    ).entries(),
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
