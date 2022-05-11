---
parent: Commands
title: modular add
---

# `modular analyze <package-name>`

Analyzes the dependencies of a package from its source code, emitting JSON to
`stdout` (please note that errors and warnings can still be emitted to
`stderr`).

## How it works

The source code of the specified package is statically analyzed to find all the
`import` or `require` statements. Then, for each external dependency imported in
the code, its `manifest` version is computed by looking at the workspace's
manifest files, and its `resolution` version is computed by parsing the
workspace's `yarn.lock`.

For this reason, `resolution` versions are strictly exact, while `manifest`
versions can contain any ammissible type of
[ranged semver](https://github.com/npm/node-semver#versions). `manifest` version
are computed by returning after the first successful lookup between these
records, in order:

1. The package's `package.json` `dependencies` field
1. The package's `package.json` `devDependencies` field
1. The root `package.json` `dependencies` field
1. The root `package.json` `devDependencies` field
