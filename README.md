<div align="center">
  <h1><img height="38px" width="44px" style="height: 38px; max-width: 44px" src="docs/img/modular-hero.svg"> &nbsp; Modular</h1>

  <p><strong>Scaled Web Engineering</strong>. Where Libraries, Views & apps coexist together and tooling is a first-class citizen.</p>
</div>

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?)](https://github.com/jpmorganchase/modular/blob/main/CONTRIBUTING.md)
![Build](https://github.com/jpmorganchase/modular/actions/workflows/node.js.yml/badge.svg)

`modular` is a collection of tools and guidance to enable UI development at
scale. It is derived from work at JP Morgan to enable development in a single
repository by many teams.

It provides a `modular` CLI to scaffold and develop a new application from
scratch, as well as commands to add and manage further modules.

## Philosophy

`modular` believes the burden to learn a "Framework" with proprietary APIs in a
rapidly evolving landscape is an inhibitor to **scaled web engineering**.

There is already a very strong set of **Language Constructs, Frameworks and
Tooling** that the front end community is rallying around like `TypeScript`,
`ES6 Modules`, `React`, `Parcel`, `Webpack`, `GitHub Actions`, `Jest`,
`Workspaces` etc.

Scaled Engineering requires a few more Frameworks, Libraries and Tools that are
not yet first class citizens in the world of Front End Engineering like
**Universal Data Fetching**, **Feature Flags**, **Analytics Capture**,
**Security**, **Deployment** etc.

`modular` attempts to bring the best Language Constructs, Libraries, Frameworks
and Tooling together to establish a set of patterns and definitions to enable
**Monorepo** based engineering.

## Commands

#### `yarn create modular-react-app <project-name>`

Bootstraps a new project, configured to use
[Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

This also creates a workspace named 'app' containing a fresh
[`create-react-app`](https://create-react-app.dev/) application written in
[TypeScript](https://www.typescriptlang.org/).

#### `yarn modular add <path/to/package>`

Adds a new package by creating a new workspace at `packages/path/to/package`.
Packages can currently be one of 3 types:

- A standalone application. This corresponds to a single `create-react-app`
  project in a workspace. Inside this workspace, you can import packages from
  other workspaces freely, and features like jsx and typechecking work out of
  the box.

- A View, which is a package that exports a React component by default. Views
  are primary, top-level components in `modular`. Read more about Views in
  [this explainer](/docs/views.md).

- A typical javascript package. You can use this to create any other kind of
  utility, tool, or whatever your needs require you to do. As an example, you
  could build a node.js server inside one of these.

#### `yarn modular start <path/to/package>`

Runs
[`react-scripts start`](https://create-react-app.dev/docs/getting-started#npm-start-or-yarn-start)
against the selected app.

#### `yarn modular test`

Runs [`jest`](https://jestjs.io/) against the entire `modular` project.

#### `yarn modular build <path/to/package>`

Runs [`react-scripts build`](https://create-react-app.dev/docs/production-build)
against the selected app.

#### `yarn modular workspace`

Prints an extension of `yarn workspaces info` to the console. Extended with
modular metadata about package type and public/private status.

## Config

#### `modular/setupEnvironment.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFiles`](https://jestjs.io/docs/en/configuration#setupfiles-array).

#### `modular/setupTests.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFilesAfterEnv`](https://jestjs.io/docs/en/configuration#setupfilesafterenv-array).

#### `package.json#modular`

_NOTE: This property is created automatically and is described here for
reference only._

_e.g._

```json
{
  "modular": {
    "type": "root"
  }
}
```

The `package.json#modular.type` can be `"root"`, `"app"`, `"view"` or
`"package"`.

##### `"root"`

This type identifies the root of the project.

##### `"view"`

This type identifies modules that export a single React component as their
default export. `modular` makes these modules available via a dynamically
generated view map with `modular-views.macro`. Read more about Views in
[this explainer](/docs/views.md).

##### `"app"`

This type identifies a standalone application that can be started or built.

##### `"package"`

This type identifies a regular package (e.g. a library that can be used by other
`"view"` or `"app"` modules).
