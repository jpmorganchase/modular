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

## `modular add <packagePath>`

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
  [this explainer](./views.md).

- A typical javascript package. You can use this to create any other kind of
  utility, tool, or whatever your needs require you to do. As an example, you
  could build a node.js server inside one of these.

### Options:

`--prefer-offline`: Uses offline yarn cache when possible

## `modular start <packageName>`

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

## `modular build <packageName>`

Searches by the name of the package indicated in the `package.json` file in the
workspace and runs
[`react-scripts build`](https://create-react-app.dev/docs/production-build)
against that package.

The output directory for built artifacts is `dist/`, which has a flat structure
of modular package names. Each built app/view/package is added to the `dist/` as
its own folder.

For views and packages, package names are transformed to `Param case` (e.g.
this-is-param-case) in `dist/`

(i.e. `modular build @scoped/package-a` will output built artifacts into
`dist/scoped-package-a`)

## `modular workspace`

Prints an extension of `yarn workspaces info` to the console. Extended with
modular metadata about package type and public/private status.

## `modular check`

Checks the modular root repo has yarn workspaces and modular packages are set up
properly and checks your package tree for issues with your dependencies.

## `modular convert`

Converts the react app in the current directory into a modular project with a
modular app workspace.

This action is `atomic` so if an error occurs while converting, it will stash
any changes made and bring the repo back to the previous state prior to the
attempt.

- Sets up the current directory as a modular project with a `packages/`
  workspaces

- Moves the current react app source content (`src/` and `public/`) into a
  modular app within `packages/` workspace

- Relocates setupTests file from `src/` to `modular/`

- Updates the react-app-env.d.ts file within the modular app to reference
  modular-scripts for types

- Updates tsconfig.json to include the modular packages workspace
