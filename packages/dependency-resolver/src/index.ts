export interface LiteWorkSpaceRecord {
  location: string;
  workspaceDependencies?: string[];
  version?: string;
}

type OrderedDependencies = Map<string, number>;
type OrderedUnvisited = { name: string; level: number };

export function walkWorkspaceDependencies(
  workspaces: Record<string, LiteWorkSpaceRecord>,
  workspaceName: string,
): OrderedDependencies {
  // Initialize the unvisited list with the immediate dependency array.
  const unvisited: OrderedUnvisited[] = (
    workspaces[workspaceName].workspaceDependencies ?? []
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
      throw new Error(`Cycle detected: ${[...cycleBreaker].join(' -> ')}`);
    }
    cycleBreaker.add(currentDependencyName);

    // Get the next immediate dependencies of the dependency we're visiting.
    const immediateDependencies =
      workspaces[currentDependencyName].workspaceDependencies;
    // If we got to an end node, we finish the current DFS traversal: reset the cycle breaker
    if (!immediateDependencies || !immediateDependencies.length) {
      cycleBreaker.clear();
    }

    // Add current dependency to the visited set.
    // If we already visited it at a lower depth in the graph, raise its level to the current depth
    // (this dependency could be a dependency of some other node, but since is also a dependency of *this* node, it gets the bigger depth of the two)
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
      // If we insert them at the star (unshift), we do a DFS walk. We want to go DFS because it's easier to detect cycles.
      unvisited.unshift(...levelledMaps);
    }
  }

  return visited;
}
