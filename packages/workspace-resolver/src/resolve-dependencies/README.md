# Dependency resolver API

## computeAncestorSet

From one or more vertices in a graph, compute the flat set of all their
ancestors (excluding the vertices themselves).

```ts
computeAncestorSet(
  originWorkspaces: string[],
  allWorkspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): Set<string>
```

### Parameters

- `originWorkspaces`: the name of the vertices of which we want to know the
  ancestors
- `allWorkspaces`: a record of workspaces expressed as
  `{ "workspace_name": { workspaceDependencies?: [ 'another_workspace', ...] }, ... }`
- `breakOnCycle`: Will throw if a cycle (circular dependency) is detected
  (default: falsy).

### Example

```ts
const workspaces = {
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['d'] },
  c: { workspaceDependencies: ['b'] },
  d: { workspaceDependencies: undefined },
  e: { workspaceDependencies: ['a', 'b', 'c'] },
};
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->B;
    E-->A;
    E-->B;
    E-->C;
```

```ts
computeAncestorSet(['d', 'b'], workspaces))
// Result:  new Set(['a', 'c', 'e'])
```

## computeDescendantSet

From one or more vertices in a graph, compute the flat set of all their
dependants (excluding the vertices themselves).

```ts
computeDescendantSet(
  originWorkspaces: string[],
  allWorkspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): Set<string>
```

### Parameters

- `originWorkspaces`: the name of the vertices of which we want to know the
  ancestors
- `allWorkspaces`: a record of workspaces expressed as
  `{ "workspace_name": { workspaceDependencies?: [ 'another_workspace', ...] }, ... }`
- `breakOnCycle`: Will throw if a cycle (circular dependency) is detected
  (default: falsy).

### Example

```ts
const workspaces = {
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['d'] },
  c: { workspaceDependencies: ['b'] },
  d: { workspaceDependencies: undefined },
  e: { workspaceDependencies: ['a', 'b', 'c'] },
};
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->B;
    E-->A;
    E-->B;
    E-->C;
```

```ts
computeDescendantSet(['a', 'b'], workspaces))
// Result:  new Set(['c', 'd'])
```

## traverseWorkspaceRelations

Traverses a dependency graph from a single vertix and returns an ordered map of
vertices. The order can be used, inverted, to compute a set of build steps.

```ts
traverseWorkspaceRelations(
  workspaceName: string,
  workspaces: Record<string, LiteWorkSpaceRecord>,
  breakOnCycle?: boolean,
): OrderedDependencies
```

### Parameters

- `workspaceName`: the name of the starting vertix
- `workspaces`: a record of workspaces expressed as
  `{ "workspace_name": { workspaceDependencies?: [ 'another_workspace', ...] }, ... }`
- `breakOnCycle`: Will throw if a cycle (circular dependency) is detected
  (default: falsy). If this is falsy and there is a cycle in the graph, the
  order in the result will not be reliable by definition.

### Examples

#### Serial order

```ts
workspaces = {
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['d'] },
  c: { workspaceDependencies: ['b'] },
  d: { workspaceDependencies: undefined },
  e: { workspaceDependencies: ['a', 'b', 'c'] },
};
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->B;
    E-->A;
    E-->B;
    E-->C;
```

```ts
traverseWorkspaceRelations('a', workspaces);
/*
// To build a, first build d, then build d, then build c
Map(
    [
        ['c', 1],
        ['b', 2],
        ['d', 3],
    ]
)
*/
```

#### Serial / parallel order

```ts
workspaces = {
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['d'] },
  c: { workspaceDependencies: ['d'] },
  d: { workspaceDependencies: undefined },
};
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

```ts
traverseWorkspaceRelations('a', workspaces);
/*
// To build a, first build d, then c and b can be built parallely
Map(
    [
        ['c', 1],
        ['b', 1],
        ['d', 2],
    ]
)
*/
```

#### Cycle

```ts
workspaces = {
  a: { workspaceDependencies: ['b'] },
  b: { workspaceDependencies: ['c'] },
  c: { workspaceDependencies: ['b'] },
};
```

```mermaid
graph TD;
    A-->B;
    B-->C;
    C-->B;
```

```ts
traverseWorkspaceRelations('a', workspaces, false);
/* Will return an unreliable order map */
traverseWorkspaceRelations('a', workspaces, true);
/* Will throw */
```

## invertDependencyDirection

Takes a dependency graph and inverts the edge direction. The result is a graph
describing the same information as the original but with the relationship
inverted. Useful to produce an ancestor graph from a descendant graph and vice
versa.

### Parameters

- `workspaces`: a record of workspaces expressed as
  `{ "workspace_name": { workspaceDependencies?: [ 'another_workspace', ...] }, ... }`

### Example

```ts
const workspaces = {
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['d'] },
  c: { workspaceDependencies: ['b'] },
  d: { workspaceDependencies: undefined },
  e: { workspaceDependencies: ['a', 'b', 'c'] },
};
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->B;
    E-->A;
    E-->B;
    E-->C;
```

```ts
invertDependencyDirection(workspaces);
```

#### Resulting (inverted) graph

```ts
{
    a: { workspaceDependencies: ['e'] },
    b: { workspaceDependencies: ['a', 'c', 'e'] },
    c: { workspaceDependencies: ['a', 'e'] },
    d: { workspaceDependencies: ['b'] },
}
```

```mermaid
graph TD;
    A-->E;
    B-->A;
    B-->C;
    B-->E;
    C-->A;
    C-->E;
    D-->B;
```
