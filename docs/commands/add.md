---
parent: Commands
title: modular add
---

# `modular add <packageName>`

Adds a new package by creating a new workspace at `packages/<packageName>`,
omitting the scope if the package is
[scoped](https://docs.npmjs.com/cli/v8/using-npm/scope). If `--path <somePath>`
is specified, create the workspace at `<somePath>/<packageName>`.

(i.e. `modular add my-app` would create a package in `packages/my-app`,
`modular add @scoped/my-scoped-app` would create a package in
`packages/my-scoped-app` and `modular add lib-a --path libs` would create a
package in `libs/lib-a`)

Packages can currently be one of the following types:

- A standalone `app`. This corresponds to a static Single Page Application (SPA)
  project in a workspace. Inside this workspace, you can import packages from
  other workspaces freely, and features like jsx and typechecking work out of
  the box.

- An `esm-view`, which is a package that typically exports a React component by
  default. ESM Views are built as ES modules that can be `import`ed at runtime
  by a host to implement a [micro frontend](../concepts/microfrontends.md)
  architecture or started as a normal standalone application. See also
  [the view building reference](../esm-views/index.md)

- A `view`, which is a `package` that exports a React component by default. Read
  more about Views in [this explainer](../concepts/views.md).

- A generic JavaScript `package`. You can use this to create a library with an
  entry point that gets transpiled to Common JS and ES Module format when built.
  Packages can be [built](../commands/build.md) but not
  [start](../commands/start.md)ed by Modular.

- A `source`, which is a shared package that is imported by other packages from
  source (i.e. directly importing its source), and it's never built standalone
  or published. This kind of package is never [built](../commands/build.md) or
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
