# Commands

Modular is designed to emulate `react-scripts` with an opinionated way of
developing, building and testing UI applications.

## `modular init`

Initializes a modular root type package.json in the current directory with
packages folder set up to add modular packages to.

### Options:

`-y`: Equivalent to setting it for `npm init`. Generates an empty npm project
without all of the interactive processes.

`--prefer-offline`: Uses offline yarn cache when possible

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

### Options:

`--prefer-offline`: Uses offline yarn cache when possible

## `modular start <path/to/package>`

Runs
[`react-scripts start`](https://create-react-app.dev/docs/getting-started#npm-start-or-yarn-start)
against the indicated app or view.

When starting a view, modular expects the the default export of the view's
`index.tsx` file to be a function that returns a component (Don't worry, this is
what modular views are initialized as). Modular will import this view as a
module within a template app, which we stage in a `node_modules/.modular`
folder. You can develop your view as you normally would an app and it will
automatically re-compile as you make changes in the view package.

## `modular test`

Runs [`jest`](https://jestjs.io/) against the entire `modular` project.

For more documentation on the test command and options see the
[documentation](./test.md)

## `modular build <path/to/package>`

Runs [`react-scripts build`](https://create-react-app.dev/docs/production-build)
against the indicated package.

## `modular workspace`

Prints an extension of `yarn workspaces info` to the console. Extended with
modular metadata about package type and public/private status.

## `modular check`

Checks the modular root repo has yarn workspaces and modular packages are set up
properly and checks your package tree for issues with your dependencies.
