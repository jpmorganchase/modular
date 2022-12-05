---
parent: Commands
title: modular build
---

# `modular build [packages...]`

Search workspaces based on their `name` field in the `package.json` and build
them according to their respective `modular.type`, in order of dependency (e.g.
if a package `a` depends on a package `b`, `b` is built first).

The output directory for built artifacts is `dist/`, which has a flat structure
of modular package names. Each built app/view/package is added to the `dist/` as
its own folder.

For views and packages, package names are transformed to `Param case` (e.g.
this-is-param-case) in `dist/`

(i.e. `modular build @scoped/package-a` will output built artifacts into
`dist/scoped-package-a`)

## Options:

`--private`: Allows the building of private packages.

`--preserve-modules`: Preserve module structure in generated modules.

`--changed`: Build only packages whose workspaces contain files that have
changed. Files that have changed are calculated comparing the current state of
the repository with the branch specified by `compareBranch` or, if
`compareBranch` is not set, with the default git branch.

`--compareBranch`: Specify the comparison branch used to determine which files
have changed when using the `changed` option. If this option is used without
`changed`, the command will fail.

`--descendants`: Build the packages specified by the `[packages...]` argument
and/or the `--changed` option and additionally build all their descendants (i.e.
the packages they directly or indirectly depend on) in dependency order.

`--ancestors`: Build the packages specified by the `[packages...]` argument
and/or the `--changed` option and additionally build all their ancestors (i.e.
the packages that have a direct or indirect dependency on them) in dependency
order.

## Dependency selection and build order examples

We'll be using this package manifests in our Modular monorepo for the following
examples:

```js
{
  "name": "a",
  "dependencies": {
    "b": "*",
    "c": "*",
    "react": ">16.8.0",
    // ...
  }
}

{
  "name": "b",
  "dependencies": {
    "c": "*",
    "react": ">16.8.0",
    // ...
  }
}

{
  "name": "c",
  "dependencies": {
    "d": "*",
    // ...
  }
}

{
  "name": "d",
  "dependencies": {}
}

{
  "name": "e",
  "dependencies": {
    "a": "*",
    // ...
  }
}
```

Which internally are filtered into this set of `WorkspaceDependencyObject`s:

```js
{
  a: { workspaceDependencies: ['b', 'c'] },
  b: { workspaceDependencies: ['c'] },
  c: { workspaceDependencies: ['d'] },
  d: { workspaceDependencies: undefined },
  e: { workspaceDependencies: ['a'] }
}
```

### Example: local workflow with descendants

Let's say we just pulled an update to our monorepo and we want to work on
workspace `b`. To be able to work with the last modifications we pulled, we want
to build `b` and all the other workspaces that `b` depends on (descendants),
either directly or indirectly. We can tell Modular that we want to build `b` and
its all descendants by using this command:

`modular build b --descendants`

Modular will first select all the descendants of `b` (according to the previous
graph: `c` because it'a direct dependency and `d` because it's a dependency of
`c`), then build them in the correct build order, where workspaces depended on
are built before workspaces that depend on them, recursively. In this example:

- `d` gets built first, because it has no dependencies
- `c` can now get built, because it only depends on `d`, that got built in the
  previous step.
- `b` can now get built, because it only depends on `c`, that got built in the
  previous step.

### Example: incremental builds with ancestors

Let's suppose we're building a PR of our monorepository on a CI pipeline, and we
want to incrementally build the workspaces that have code changes compared to
the base branch. Since those workspaces will generate new, different build
artefacts, we can't just build them and call it a day; we also need to re-build
all the workspaces that depend on the changed workspaces, and those who depend
on them, and so on. In other words, we need a way to tell Modular to build the
ancestors of the changed workspaces. This command:

`modular build --changed --ancestors`

will identify all the workspaces that have changed compared to the
`--compareBranch` (which is the repository's base branch by default), then
identify all the workspaces which directly or indirectly depend on them
(ancestors) and build the resulting set of packages in the correct build order,
where workspaces depended on are built before workspaces that depend on them,
recursively. If we suppose that workspaces `b` and `c` have changed, Modular
will:

- Select all ancestors of `b` and `c`, which are `a` (because it depends on
  both) and `e` (because it depends on `a`).
- Build `c` first, because it doesn't depend on any package that has changed (it
  only depends on `d`, which is not in the changed set).
- Build `b`, because it only depends on `c`, that got built in the previous
  step.
- Build `a`, because it depends on `b` and `c`, that got built in the previous
  steps.
- Build `e`, because it only depends on `a`, that got built in the previous
  step.
