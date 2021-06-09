# Commands

Modular is designed to emulate `react-scripts` with an opinionated way of
developing, building and testing UI applications.

## `modular add <path/to/package>`

Adds a new package by creating a new workspace at `packages/path/to/package`.
Packages can currently be one of 3 types:

- A standalone application. This corresponds to a single `create-react-app`
  project in a workspace. Inside this workspace, you can import packages from
  other workspaces freely, and features like jsx and typechecking work out of
  the box.

- A View, which is a package that exports a React component by default. Views
  are primary, top-level components in `modular`. Read more about Views in
  [this explainer](./views.md).

- A typical javascript package. You can use this to create any other kind of
  utility, tool, or whatever your needs require you to do. As an example, you
  could build a node.js server inside one of these.

## `modular start <path/to/package>`

Runs
[`react-scripts start`](https://create-react-app.dev/docs/getting-started#npm-start-or-yarn-start)
against the selected app.

## `modular test`

Runs [`jest`](https://jestjs.io/) against the entire `modular` project.

For more documentation on the test command see the [documentation](./test.md)

## `modular build <path/to/package>`

Runs [`react-scripts build`](https://create-react-app.dev/docs/production-build)
against the selected app.

## `modular workspace`

Prints an extension of `yarn workspaces info` to the console. Extended with
modular metadata about package type and public/private status.
