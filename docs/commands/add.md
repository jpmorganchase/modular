---
parent: Commands
title: modular add
---

# `modular add <packageName>`

Adds a new package by creating a new package at the workspace located at
`packages/<packageName>`, omitting the scope if the package is
[scoped](https://docs.npmjs.com/cli/v8/using-npm/scope). If `--path <somePath>`
is specified, the command creates the workspace at `<somePath>/<packageName>`.

(i.e. `modular add my-app` would create a package in `packages/my-app`,
`modular add @scoped/my-scoped-app` would create a package in
`packages/my-scoped-app` and `modular add lib-a --path libs` would create a
package in `libs/lib-a`)

The `modular add` command prompts the user to choose the Modular `type` of the
package it's about to create. The next section briefly describes the various
types that can be created by the `modular add` command. For an in-depth
discussion of the available package types and their characteristics, please see
[this page](../concepts/package-types.md).

### Standalone (bundled) package types

These package types are built with [Webpack v5](https://webpack.js.org/) or, if
specified in the [configuration](../configuration.md),
[esbuild](https://esbuild.github.io/). Modules imported in the source of these
package types are bundled in the final result (in case of `esm-view`s, only
local modules get bundled, and external dependencies are rewritten to use an
external ESM CDN. [This section](../esm-views/index.md) explains the process in
more depth).

- `app`. This package type corresponds to a static Single Page Application (SPA)
  project in a workspace. It's possible to specify a custom `index.html` file
  and public assets in the `public` directory. See
  [this page](../concepts/package-types.md/#app) for more information about
  apps.

- `esm-view`. This package type is an app that gets built as an ES module that
  can be imported at runtime. `esm-view`s are typically used to implement a
  [micro-frontend](../concepts/microfrontends.md) architecture. `esm-views`,
  when [built](./build.md) or [started](./start.md) will also generate a
  `index.html` file that tries to load the ES Module and render its default
  export as a React component onto the DOM (standalone mode). See also
  [the esm-view reference](../esm-views/index.md) for an in-depth introduction.

### Library package types

These package types are either built with
[Rollup.js](https://rollupjs.org/guide/en/) as CommonJS and ES Modules or, in
case of `source` modules, they are not built at all. Library package types get
typically published to NPM (`package` and `view` types) or get imported by other
packages in the monorepo (`source` type). For this reason, files are transpiled
separately on buld and external dependencies are never "pulled in" (no
bundling).

- `package`. This is a generic package with a single entry point. It's normally
  used to create a publishable library that gets transpiled to Common JS and ES
  Module format when built. Packages can be [built](../commands/build.md) but
  not [start](../commands/start.md)ed by Modular.

- `view`. This is a `package` that exports a default React component. Views are
  built exactly like `package`s, but, since Modular knows that the default
  export can be rendered, `view`s can be [`modular start`](../start.md)ed to
  preview them locally.

- `source`. A shared package that is imported by other package types in the
  monorepo, directly specifying one or more of its source files. This kind of
  package can be never [built](../commands/build.md) or
  [start](../commands/start.md)ed by Modular.

## Options:

`--path`: Optionally set the directory in which the workspace is created. If the
provided path is outside (i.e., not a descendant) of the paths specified in
[the `workspaces` field](https://classic.yarnpkg.com/lang/en/docs/workspaces/#toc-how-to-use-it)
of the root `package.json`, the command will fail

`--prefer-offline`: Uses offline yarn cache when possible

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true

`--template <templateName>`: Use the package `templateName` from the repository
or the registry as a template for the new package. Find more information about
Modular templates [in this page](../concepts/templates.md)
