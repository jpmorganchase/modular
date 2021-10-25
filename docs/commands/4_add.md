# `modular add <packagePath>`

Adds a new package by creating a new workspace at `packages/<packagePath>`

(i.e. `modular add my-app` would create a package in `packages/my-app` and
`modular add libs/lib-a` would create a package in `packages/libs/lib-a`)

Packages can currently be one of 3 types:

- A standalone application. This corresponds to a single `create-react-app`
  project in a workspace. Inside this workspace, you can import packages from
  other workspaces freely, and features like jsx and typechecking work out of
  the box.

- A View, which is a package that exports a React component by default. Views
  are primary, top-level components in `modular`. Read more about Views in
  [this explainer](../concepts/views.md).

- A typical javascript package. You can use this to create any other kind of
  utility, tool, or whatever your needs require you to do. As an example, you
  could build a node.js server inside one of these.

## Options:

`--prefer-offline`: Uses offline yarn cache when possible

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true
