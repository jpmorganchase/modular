export interface LiteWorkSpaceRecord {
  workspaceDependencies?: string[];
}

type OrderedDependencies = Map<string, number>;
type OrderedUnvisited = { name: string; level: number };

export function computeDescendantSet(
  originWorkspaces: string[],
  allWorkspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): Set<string> {
  // This function computes the ordered dependants of one or more packages, then flattens and dedupes them in a set

  let descendantList: string[] = [];
  for (const entrypoint of originWorkspaces) {
    // Get the dependency relations for every entrypoint, then flatten them
    const descendantsArray = Array.from(
      traverseWorkspaceRelations(
        entrypoint,
        allWorkspaces,
        breakOnCycle,
      ).keys(),
    ).flat(Infinity);
    // And add them to the global dependency list
    descendantList = descendantList.concat(descendantsArray);
  }
  // The descendant list is a list containing all the descendants, possibily duplicated.
  // 1 - Remove the input workspaces
  // 2 - Convert it to Set to dedupe it.
  return setDiff(new Set(descendantList), new Set(originWorkspaces));
}

export function computeAncestorSet(
  originWorkspaces: string[],
  allWorkspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): Set<string> {
  // Computing an ancestor set is like computing a dependant set with an inverted graph
  return computeDescendantSet(
    originWorkspaces,
    computeAncestorFromDescendants(allWorkspaces),
    breakOnCycle,
  );
}

// This function takes a tree of dependencies (dependant -> child dependencies)
// and returns an equivalent tree where the relation's direction is inverted
// (dependency -> parent dependencies)
// This allows us to use the same algorithm to query ancestors or descendants.
export function computeAncestorFromDescendants(
  workspaces: Record<string, LiteWorkSpaceRecord>,
): Record<string, LiteWorkSpaceRecord> {
  return Object.entries(workspaces).reduce<Record<string, LiteWorkSpaceRecord>>(
    (output, [currentWorkspace, workspaceRecord]) => {
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
    },
    Object.create(null),
  );
}

// This function traverses the graph to get an ordered set of dependencies (map reverseOrder => dependencyName)
// This iterative solution visits all the dependencies in the graph in a DFS walk
// If it encounters an unvisited dependency, it puts it in the visited bin and put all its dependencies in the unvisited bin
// If it encounters an already visited dependency with the same parent, there's a cycle in the graph. Switch on breakOnCycle to either throw or continue
// If it encounters an already visited dependency with a different parent, update the dependency's order based on it parent's order
export function traverseWorkspaceRelations(
  workspaceName: string,
  workspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): OrderedDependencies {
  // Initialize the unvisited list with the immediate dependency array.
  const unvisited: OrderedUnvisited[] = (
    workspaces[workspaceName]?.workspaceDependencies ?? []
  ).map((dep) => ({ name: dep, level: 1 }));
  // visited holds all the nodes that we've visited previously
  const visited: OrderedDependencies = new Map();
  // cycleBreaker holds our DFS path and helps identifying cycles
  const cycleBreaker: Set<string> = new Set();

  while (unvisited.length) {
    // Consume the remaining unvisited descendants one by one
    const unvisitedDependency = unvisited.shift();
    if (!unvisitedDependency) continue;

    const { name: currentDependencyName, level: currentDependencyDepth } =
      unvisitedDependency;

    // If we're re-visiting a descendant in the current DFS run we have a cycle
    if (cycleBreaker.has(currentDependencyName)) {
      // Sets are guaranteed to be iterable in insertion order, so they will represent our traversal order faithfully
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
      if (breakOnCycle)
        throw new Error(`Cycle detected: ${[...cycleBreaker].join(' -> ')}`);
      else {
        continue;
      }
    }
    cycleBreaker.add(currentDependencyName);

    // Get the next immediate dependencies of the dependency we're visiting.
    const immediateDependencies =
      workspaces[currentDependencyName]?.workspaceDependencies;
    // If we got to an end node, we finish the current DFS traversal: reset the cycle breaker
    if (!immediateDependencies || !immediateDependencies.length) {
      cycleBreaker.clear();
    }

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
      const levelledMaps = immediateDependencies?.map((dep) => ({
        name: dep,
        level: currentDependencyDepth + 1,
      }));
      // If we insert the immediate dependencies at the end (push), we do a BFS walk.
      // If we insert them at the star (unshift), we do a DFS walk. We want DFS because it's easier to detect cycles.
      unvisited.unshift(...levelledMaps);
    }
  }

  return visited;
}

function setDiff<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter((x) => !b.has(x)));
}
