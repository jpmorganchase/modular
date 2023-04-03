import {
  computeDescendantSet,
  computeAncestorSet,
  traverseWorkspaceRelations,
} from '@modular-scripts/workspace-resolver';
import { isBuildableModularType } from './packageTypes';
import { getAllWorkspaces } from './getAllWorkspaces';
import { getChangedWorkspacesContent } from './getChangedWorkspaces';
import getModularRoot from './getModularRoot';
import { PackageType, WorkspaceMap } from '@modular-scripts/modular-types';

/**
 * @typedef {Object} SelectOptions
 * @property {string[]} targets - An array of package names to select
 * @property {boolean} changed - Whether to additionally select packages that have changes, compared to "compareBranch"
 * @property {boolean} ancestors - Whether to additionally select packages that are ancestors of (i.e.: [in]directly depend on) the selected packages
 * @property {boolean} descendants - Whether to additionally select packages that descend from (i.e.: are [in]directly depended on by) the selected packages
 * @property {string?} compareBranch - The git branch to compare with when "changed"  is specified
 */

interface SelectOptions {
  targets: string[];
  changed: boolean;
  ancestors: boolean;
  descendants: boolean;
  compareBranch?: string;
}

interface SelectBuildableOptions extends SelectOptions {
  dangerouslyIgnoreCircularDependencies?: boolean;
}

/**
 * Select all target packages in workspaces in random order, optionally including changed, ancestors and descendant packages
 *
 * This method will not throw, even if there are circular dependencies in the graph
 *
 * @param  {SelectOptions} options The target options to configure selection
 * @return {Promise<string[]>} A distinct list of selected package names
 */

export async function selectWorkspaces(
  options: SelectOptions,
): Promise<string[]> {
  return [...new Set((await computeWorkspaceSelection(options)).packageScope)];
}

/**
 * Select buildable target packages in build order, optionally including changed, ancestors and descendant packages. The result is returned as an array of package names.
 *
 * Please note that the build order algorithm can't calculate build order if there's a cycle in the dependency graph,
 * so circular dependencies will throw unless they only involve packages that don't get built (i.e. "source" `modular.type`s).
 * Please also note that circular dependencies can always be fixed by creating an additional package that contains the common parts,
 * and that they are considered a code smell + a source of many issues (e.g. https://nodejs.org/api/modules.html#modules_cycles)
 * and they make your code fragile towards refactoring, so please don't introduce them in your monorepository.
 *
 * @param  {SelectBuildableOptions} options The target options to configure selection
 * @return {Promise<string[]>} A distinct list of selected buildable package names, in build order
 */

export async function selectBuildableWorkspaces(
  options: SelectBuildableOptions,
): Promise<string[]> {
  // Flatten the subarrays (that signal parallelism) to make an ordered serial sequence
  return (await selectParallellyBuildableWorkspaces(options)).flat();
}

/**
 * Select buildable target packages in build order, optionally including changed, ancestors and descendant packages. The result is returned as a 1-level nested array of package names, where sub-arrays can be built parallely
 *
 * Please note that the build order algorithm can't calculate build order if there's a cycle in the dependency graph,
 * so circular dependencies will throw unless they only involve packages that don't get built (i.e. "source" `modular.type`s).
 * Please also note that circular dependencies can always be fixed by creating an additional package that contains the common parts,
 * and that they are considered a code smell + a source of many issues (e.g. https://nodejs.org/api/modules.html#modules_cycles)
 * and they make your code fragile towards refactoring, so please don't introduce them in your monorepository.
 *
 * @param  {SelectBuildableOptions} options The target options to configure selection
 * @return {Promise<string[][]>} A nested (1 level depth) list of selected buildable package names, in build order. Nested subarrays can be built parallely.
 */

export async function selectParallellyBuildableWorkspaces(
  options: SelectBuildableOptions,
): Promise<string[][]> {
  const { ancestors, descendants, dangerouslyIgnoreCircularDependencies } =
    options;
  const {
    packageScope,
    isBuildable,
    allWorkspacesMap,
    descendantsSet,
    ancestorsSet,
    targetsToBuild,
  } = await computeWorkspaceSelection(options);
  if (!dangerouslyIgnoreCircularDependencies) {
    // Here we're using traverseWorkspaceRelations to warn us if there's at least one cyclical dependency in the graph
    // Since the dependency graph can be disconnected, it makes only sense to calculate cycles in the context
    // of a subset of packages we want to build (aka the package scope)
    void traverseWorkspaceRelations(packageScope, allWorkspacesMap);
  }

  const buildablePackageScope = [...new Set(packageScope)].filter(isBuildable);
  // Since buildOrder is true, we want to select packages in build order. The build order algorithm gives up if there's a cycle in the dependency graph
  // (since it can't know what to build first if A depends on B but B depends on A), so we can allow cycles only if they involve packages that are not built
  // (i.e. "source" `modular.type`s). Please note that dependency cycles can always be fixed by creating an additional package that contains the common parts,
  // and that circular dependencies are a source of many additional issues.

  // The package graph is reduced to a graph where all vertices are buildable.
  // To do that, we need to first filter the vertices, then filter the edges that might be pointing to a non-buildable vertex
  const buildableWorkspacesMap = Object.fromEntries(
    Object.entries(allWorkspacesMap)
      .filter(([name]) => isBuildable(name))
      .map(([name, workspace]) => {
        return [
          name,
          {
            ...workspace,
            workspaceDependencies:
              workspace.workspaceDependencies.filter(isBuildable),
          },
        ];
      }),
  );

  // traverseWorkspaceRelations will walk the given graph (in this case, the graph of all buildable packages) and generate the whole ordering needed to build a package
  // which means that it will possibly expand the scope (it just generates the dependency order starting from a dependency subset but taking into account the whole dependency graph)
  // this means that we can generate an order from any strict subset of packages, but we need to filter out all the unwanted packages later.
  const targetEntriesWithOrder = [
    ...traverseWorkspaceRelations(
      buildablePackageScope,
      buildableWorkspacesMap,
    ).entries(),
  ];

  return (
    targetEntriesWithOrder
      // Filter out descendants and ancestors if we don't explicitly need them.
      // This allows us to get the correct dependency order even if we restrict the scope (for example, by explicit user input).
      .filter(
        ([packageName]) =>
          (descendants && descendantsSet.has(packageName)) ||
          (ancestors && ancestorsSet.has(packageName)) ||
          targetsToBuild.includes(packageName),
      )
      // The output is a sequence of [packageName, level] - transform it into a sequence of [[level_0_pkg, ...], [level_1_pkg, ...], ...]
      .reduce<string[][]>((acc, [pkg, level]) => {
        acc[level] ? acc[level].push(pkg) : (acc[level] = [pkg]);
        return acc;
      }, [])
      // Reverse in actual build order
      .reverse()
  );
}

/**
 * Common data structures / functions to calculate package selection
 */

async function computeWorkspaceSelection({
  targets,
  changed,
  ancestors,
  descendants,
  compareBranch,
}: SelectOptions): Promise<{
  packageScope: string[];
  isBuildable: (name: string) => boolean | undefined;
  allWorkspacesMap: WorkspaceMap;
  ancestorsSet: Set<string>;
  descendantsSet: Set<string>;
  targetsToBuild: string[];
}> {
  const [allWorkspacePackages, allWorkspacesMap] = await getAllWorkspaces(
    getModularRoot(),
  );
  let changedTargets: string[] = [];

  if (changed) {
    const [, buildTargetMap] = await getChangedWorkspacesContent(compareBranch);
    changedTargets = Object.keys(buildTargetMap);
  }

  const targetsToBuild = [...new Set(targets.concat(changedTargets))];

  // We want to remove all the non-buildable packages from the package scope.
  // Let's create a filter predicate that looks up to the package map in the closure on the fly.
  const isBuildable = (name: string) => {
    const packageInfo = allWorkspacePackages.get(name);
    const type = packageInfo?.modular?.type;
    const buildScript = packageInfo?.rawPackageJson?.scripts?.build;
    // If the package has a modular type and the type is buildable, the package is buildable
    if (type && isBuildableModularType(type as PackageType)) return true;
    // If the package has no modular configuration but has a build script, then it's a non-Modular buildable package
    if (!packageInfo?.modular && buildScript) return true;
    // In all other occasions, the package is not buildable
    return false;
  };

  let ancestorsSet: Set<string> = new Set();
  let descendantsSet: Set<string> = new Set();
  let packageScope: string[] = [];

  if (targetsToBuild.length) {
    // Calculate the package scope, i.e. the deduped array of all the packages we need to generate an ordering graph for.
    // We need to remember ancestor and descendant sets in order to select them later.

    packageScope = targetsToBuild;

    if (descendants) {
      descendantsSet = computeDescendantSet(targetsToBuild, allWorkspacesMap);
      packageScope = packageScope.concat([...descendantsSet]);
    }

    if (ancestors) {
      ancestorsSet = computeAncestorSet(targetsToBuild, allWorkspacesMap);
      packageScope = packageScope.concat([...ancestorsSet]);
    }
  }

  return {
    packageScope,
    isBuildable,
    allWorkspacesMap,
    ancestorsSet,
    descendantsSet,
    targetsToBuild,
  };
}
