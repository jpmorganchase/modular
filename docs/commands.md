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

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true

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

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true

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

### Options:

`--private`: Allows the building of private packages

`--preserve-modules`: Preserve module structure in generated modules

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

- Updates the `react-app-env.d.ts` file within the modular app to reference
  modular-scripts for types

- Updates `tsconfig.json` to include the modular packages workspace

- Removes `react-scripts` as a dependency and installs
  eslint-config-modular-app. You can point to it by adding 'modular-app' to the
  extends array in your eslint config.

## `modular port <relativePath>`

Takes a relative path from the modular root directory to the targeted
create-react-app project and ports it over to the current modular project as a
moudlar app.

```
$ modular port ../another-react-app
```

This action is `atomic` so if an error occurs while porting, it will stash any
changes made and bring the repo back to the previous state prior to the attempt.

- Creates a new folder in packages workspace, named using your targeted app's
  package.json name

- Moves the `src` and `public` folders into the new workspace

- If present, updates the `react-app-env.d.ts` file within the new workspace to
  reference modular-scripts for types of static assets (e.g. svgs)

- Creates a tsconfig.json within the new workspace to extend the root
  `tsconfig.json`

- If you do not have a `modular/setupTests` file and the targeted app has a
  `src/setupTests` file, it will move it into the `modular` folder to load
  before executing `modular test`

- Resolves dependencies between the two repos.

#### Dependency Resolution

`modular port` does not set up `nohoist` in `package.json` for mismatched
versions.

If the targeted app has a `dependency` that is versioned differently than the
modular root dependency, the package@version in modular root will take
precedence.

If the targeted app has a `devDependency` that is marked as a `dependency` in
modular root, it will not be ported over into the modular app as a
`devDependency` but instead be kept as a dependency in modular root. During this
resolution, if modular root has the package in its dependencies, the version in
modular root will take precedence.

Given the case that the app you are porting over has a dependency that is a
local package in modular worktree, if the target app's dep has a different
version than the local version, that package would not be symlinked to the local
package at all if brought over directly. It would get its own copy in its
node_modules.
(https://github.com/yarnpkg/yarn/issues/6898#issuecomment-478188695)

Example: TargetApp's dependency: foo@^1.0.5

Modular package foo's local version: 2.0.1

TargetApp will have copy of foo@1.0.5 in its workspace node_modules.

It will be marked as a `mismatchedWorkspaceDependencies` in yarn workspaces. We
do not allow `mismatchedWorkspaceDependencies` in the modular workspace.

If the targeted app has a `dependency` or `devDependency` of a package that is a
local workspace in your modular repo, we will remove that dependency from the
target app and have it use the local symlinked version instead.

## `modular typecheck`

`modular typecheck` will programmatically report the semantic, syntactic, and
declaration type errors found in your code, based on your tsconfig.json.

In a CI environment, it will print condensed errors if they are present.

In non-CI environments, it will print the full details of the error, line, and
small snapshot of the offending line in question.

## `modular lint`

`modular lint` will check the diff between the current branch and your remote
origin default branch (i.e. `master` or `main`) and only lint the `.ts`, `.tsx`,
`.js`, `.jsx` files that have changes.

It uses your project eslint config to lint and jest runner to report on the lint
status of each file (`PASS` or `FAIL`). If a file has a lint warning, the
command will be marked as failed, with printed eslint errors for each
warning/error.

When in CI, it will default to lint the entire codebase. When not in CI, it will
default to only lint the diffed files.

### Options:

`--all`: Lints the entire codebase

`--fix`: Allows eslint to fix the errors and warnings that do not require manual
intervention wherever possible
