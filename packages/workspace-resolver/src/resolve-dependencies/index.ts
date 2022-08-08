import type { WorkspaceDependencyObject } from '@modular-scripts/modular-types';

type OrderedDependencies = Map<string, number>;
type OrderedUnvisited = { name: string; level: number };
type OptionalWorkspaceDependencyObject = Partial<WorkspaceDependencyObject>;

export function computeDescendantSet(
  workspaceNames: string[],
  allWorkspaces: Record<string, OptionalWorkspaceDependencyObject>,
): Set<string> {
  // Really simple and performant ancestors collection: walk the graph via BFS and collect all the dependencies encountered in a set.
  // If one dependency was already encountered before, don't process it. This is cycle resistant.
  const unvisited: string[] = [...workspaceNames];
  const visited: Set<string> = new Set();

  while (unvisited.length) {
    const currentDependency = unvisited.shift();
    if (!currentDependency) break;
    visited.add(currentDependency);

    const immediateDependencies =
      allWorkspaces[currentDependency]?.workspaceDependencies;

    if (immediateDependencies) {
      for (const immediateDep of immediateDependencies) {
        if (!visited.has(immediateDep)) {
          unvisited.push(immediateDep);
        }
      }
    }
  }
  return setDiff(visited, new Set(workspaceNames));
}

export function computeAncestorSet(
  workspaceNames: string[],
  allWorkspaces: Record<string, WorkspaceDependencyObject>,
): Set<string> {
  // Computing an ancestor set is like computing a dependant set with an inverted graph
  return computeDescendantSet(
    workspaceNames,
    invertDependencyDirection(allWorkspaces),
  );
}

// This function takes a tree of dependencies (dependant -> child dependencies)
// and returns an equivalent tree where the relation's direction is inverted
// (dependency -> parent dependencies)
// This allows us to use the same algorithm to query ancestors or descendants.
export function invertDependencyDirection(
  workspaces: Record<string, WorkspaceDependencyObject>,
): Record<string, OptionalWorkspaceDependencyObject> {
  return Object.entries(workspaces).reduce<
    Record<string, WorkspaceDependencyObject>
  >((output, [currentWorkspace, workspaceRecord]) => {
    // Loop through all the dependencies for currentWorkspace and save the inverse relation in the output
    workspaceRecord.workspaceDependencies?.forEach((dependency) => {
      // Create a workspaceAncestors record if not already present
      if (!output[dependency]) {
        output[dependency] = { workspaceDependencies: [] };
      }
      // Insert if the ancestor is not already present.
      // This would be less costly with a Set, but a Set would come at the cost of arrayfy-ing all the Sets later
      if (
        !output[dependency].workspaceDependencies?.includes(currentWorkspace)
      ) {
        output[dependency].workspaceDependencies?.push(currentWorkspace);
      }
    });
    return output;
  }, Object.create(null));
}

// This function traverses the graph to get an ordered set of dependencies (map reverseOrder => dependencyName)
export function traverseWorkspaceRelations(
  workspaceNames: string[],
  workspaces: Record<string, WorkspaceDependencyObject>,
): OrderedDependencies {
  const workspaceN = Object.values(workspaces).length;
  // Initialize the unvisited list with the immediate dependency arrays.
  const unvisitedList = workspaceNames.reduce<string[]>(
    (acc, workspaceName) => {
      const immediate = workspaces[workspaceName]?.workspaceDependencies ?? [];
      return [...acc, ...immediate];
    },
    [],
  );
  // Dedupe initial unvisited and start from order 1
  const unvisited: OrderedUnvisited[] = Array.from(new Set(unvisitedList)).map(
    (dep) => ({
      name: dep,
      level: 1,
    }),
  );

  // visited holds all the nodes that we've visited previously
  const visited: OrderedDependencies = new Map(
    workspaceNames.map((dep) => [dep, 0]),
  );
  // cycleBreaker holds our DFS path and helps identifying cycles
  const cycleBreaker: Set<string> = new Set();

  while (unvisited.length) {
    // Consume the remaining unvisited descendants one by one
    const unvisitedDependency = unvisited.shift();
    if (!unvisitedDependency) break;

    const { name: currentDependencyName, level: currentDependencyDepth } =
      unvisitedDependency;
    cycleBreaker.add(currentDependencyName);

    // Get the next immediate dependencies of the dependency we're visiting.
    const immediateDependencies =
      workspaces[currentDependencyName]?.workspaceDependencies;

    // Add current dependency to the visited set.
    // If we already visited it at a lower depth in the graph, raise its level to the current depth
    // (i.e. this dependency could be a dependency of some other node, but since is also a dependency of *this* node, it gets the bigger depth of the two)
    const dependencyLevel = visited.has(currentDependencyName)
      ? Math.max(
          currentDependencyDepth,
          visited.get(currentDependencyName) ?? -1,
        )
      : currentDependencyDepth;
    visited.set(currentDependencyName, dependencyLevel);

    // All our immediate dependencies are inserted into unvisited, with a depth level = this node + 1
    if (immediateDependencies) {
      const immediateDependenciesWithDepth = immediateDependencies?.map(
        (dep) => ({
          name: dep,
          level: currentDependencyDepth + 1,
        }),
      );
      for (const dep of immediateDependenciesWithDepth) {
        // If we're enqueueing a dependency that we have already processed in this walk, we have a cycle.
        if (cycleBreaker.has(dep.name) || currentDependencyDepth > workspaceN) {
          throw new Error(
            `Cycle detected, ${[...cycleBreaker, dep.name].join(' -> ')}`,
          );
        }
        // If we insert the immediate dependencies at the end (push), we do a BFS walk.
        // If we insert them at the start (unshift), we do a DFS walk.
        unvisited.unshift(dep);
      }

      // If we got to an end node, we finish the current DFS traversal: reset the cycle breaker
      if (!immediateDependencies || !immediateDependencies.length) {
        cycleBreaker.clear();
      }
    }
  }

  return visited;
}

function setDiff<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter((x) => !b.has(x)));
}
