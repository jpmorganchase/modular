---
title: Circular Dependencies
parent: Concepts
nav_order: 200
---

# Circular dependencies and Modular

`modular build` always tries to calculate the build order based on the workspace
dependency graph. If it encounters a cyclic dependency during this calculation,
it will bail out, since the build order can't be determined (if A depends on the
build result of B and B depends on the build result of A, which one should be
get built first?)

Circular dependencies should never be introduced in your Modular monorepository;
apart from interfering with the calculation of build order, they can
[lead to unexpected results in require order](https://nodejs.org/api/modules.html#cycles),
they can confuse developer tools and they are always fixable
[by creating additional dependencies which contain the common parts](https://nx.dev/recipes/other/resolve-circular-dependencies).
Even you manage to avoid all of those issues, circular dependencies can make
refactoring fragile: if a part of A depends on a part of B and an unrelated part
of B depends on an unrelated part of A, refactoring code in A can make the
require order in B fail and vice versa.

## Escape hatch: `--dangerouslyIgnoreCircularDependencies`

If your circular dependencies involve packages that never get built (namely,
`modular.type: source` packages), Modular can still calculate the correct build
order by removing them from the dependency graph. By default, `modular build`
will still refuse to build any build graph that contains a circular dependency,
but this behaviour can be overridden by specifying the
`--dangerouslyIgnoreCircularDependencies` flag. Please note that `modular build`
will still fail if the cycle involves two or more buildable (i.e. non-`source`)
packages. This doesn't solve all the other issues linked to
`--dangerouslyIgnoreCircularDependencies`, so please don't use this flag in
production and always split you dependencies to avoid cycles.

## Examples

### Cycle disappearing when `source` types are removed from the dependency graph

(assuming that `package` b is depending on `source` c and `source` c is
depending on `package` b and `package` d):

Without `--dangerouslyIgnoreCircularDependencies` the build fails:

```bash
> modular-dev build b --descendants
[modular] Building packages at: b
[modular] Cycle detected, b -> c -> b
```

With `--dangerouslyIgnoreCircularDependencies` the build warns but succeeds:

```bash
> modular-dev build b --descendants --dangerouslyIgnoreCircularDependencies
[modular] Building packages at: b
[modular] You chose to dangerously ignore cycles in the dependency graph. Builds will still fail if a cycle is found involving two or more buildable packages. Please note that the use of this flag is not recommended. It's always possible to break a cyclic dependency by creating an additional dependency that contains the common code.
[modular] $ b: generating .d.ts files
[modular] $ b: building b...
[modular] $ b: built b in /Users/modular/dev/rig/ghost-building/dist/b
[modular] $ d: generating .d.ts files
[modular] $ d: building d...
[modular] $ d: built d in /Users/modular/dev/rig/ghost-building/dist/d
```

### Cycle not disappearing when `source` types are removed from the dependency graph

(assuming that `package` b is depending on `package` c and `package` c is
depending on `package` b and `package` d):

Even with `--dangerouslyIgnoreCircularDependencies` the build fails:

```bash
> modular-dev build b --descendants --dangerouslyIgnoreCircularDependencies
[modular] Building packages at: b
[modular] You chose to dangerously ignore cycles in the dependency graph. Builds will still fail if a cycle is found involving two or more buildable packages. Please note that the use of this flag is not recommended. It's always possible to break a cyclic dependency by creating an additional dependency that contains the common code.
[modular] Cycle detected, b -> c -> b
```
