---
parent: Commands
title: modular build
---

# `modular build [options] [packages...]`

Search workspaces based on their `name` field in the `package.json` and build:

- Modular packages them according to their respective `modular.type`.
- Non-Modular packages (i.e. packages without a `modular` configuration) only if
  they have a `build`
  [script](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#scripts),
  by running `yarn build` on the package's
  [workspace](https://classic.yarnpkg.com/en/docs/cli/workspace).

Packages are always built in order of dependency (e.g. if a package `a` depends
on a package `b`, `b` is built first).

The output directory for built artifacts is `dist/`, which has a flat structure
of modular package names. Each built app/view/package is added to the `dist/` as
its own folder.

When `packages` is empty and no selective options have been specified (for
example when running `yarn modular build`), all packages in the monorepo will be
built. When `packages` contains one or more non-existing package name, the
non-existing packages will be ignored without an error. If any package or
selective option have been defined but the final set of regular expressions is
empty, Modular will write a message to `stdout` and exit with code `0`.

For views and packages, package names are transformed to `Param case` (e.g.
this-is-param-case) in `dist/`

(i.e. `modular build @scoped/package-a` will output built artifacts into
`dist/scoped-package-a`)

## Options:

`--private`: Allows the building of private packages.

`--preserve-modules`: Preserve module structure in generated modules.

`--changed`: Build only the packages whose workspaces contain files that have
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

## Non-Modular packages

Packages without a `modular` configuration are built only if they have a `build`
[script](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#scripts) in
their `package.json`. For example, if you have a Modular package named "app" of
type `app` that imports a simple non-Modular package called
"non-modular-buildable" that is able to build itself using `tsc`:

### packages/non-modular-buildable/package.json

```json
{
  "name": "non-modular-buildable",
  "private": false,
  "scripts": {
    "build": "tsc --skipLibCheck"
  },
  "files": ["dist", "src"],
  "main": "./dist/index.js",
  "version": "1.0.0"
}
```

### packages/non-modular-buildable/src/index.ts

```ts
export default function add(a: number, b: number): number {
  return a + b;
}
```

### packages/non-modular-buildable/tsconfig.json

```json
{
  "include": ["src"],
  "compilerOptions": {
    "target": "es2018",
    "outDir": "dist",
    "lib": ["dom", "esnext"],
    "declaration": true,
    "moduleResolution": "node",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

### packages/app/src/App.tsx

```tsx
import * as React from 'react';
import sum from 'non-modular-buildable';
import logo from './logo.svg';
import './App.css';

function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>This is the sum:</p>
        <p>
          <code>7 + 7 = {sum(7, 7)}</code>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
```

`yarn modular build` will, in this order:

1. Build `non-modular-buildable` by calling
   `yarn workspace non-modular-buildable build` and waiting for the spawned
   process to terminate successfully
2. Build `app` using Modular's build scripts and configuration, bundling the
   previously built `non-modular-buildable` dependency

Please note that Modular merely works as a task runner when building non-modular
packages: it's your responsibility to ensure that the `build` script works and
that your `package.json` is correctly configured to export the right functions
in the right format.
