---
parent: Commands
title: modular add
---

# `modular add <packagePath>`

Adds a new package by creating a new workspace at `packages/<packagePath>`

(i.e. `modular add my-app` would create a package in `packages/my-app` and
`modular add libs/lib-a` would create a package in `packages/libs/lib-a`)

Packages can currently be one of the following types:

- A standalone `app`. This corresponds to a single `create-react-app` project in
  a workspace. Inside this workspace, you can import packages from other
  workspaces freely, and features like jsx and typechecking work out of the box.

- An `esm-view`, which is a package that typically exports a React component by
  default. ESM Views are built as ES modules that can be `import`ed at runtime
  by a host to implement a [micro frontend](../concepts/microfrontends.md)
  architecture or started as a normal standalone application. See also
  [the view building reference](../esm-views/index.md)

- A `view`, which is a package that exports a React component by default. Read
  more about Views in [this explainer](../concepts/views.md).

- A typical JavaScript `package`. You can use this to create any other kind of
  utility, tool, or whatever your needs require you to do. As an example, you
  could build a node.js server inside one of these.

## Options:

`--prefer-offline`: Uses offline yarn cache when possible

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true

`--template <templateName>`: Use the package `templateName` from the repository
or the registry as a template for the new package. Find more information about
Modular templates [in this page](../concepts/templates.md)
