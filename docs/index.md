---
nav_order: 1
title: Modular
---

<div align="center">
  <h1><img height="38px" width="44px" style="height: 38px; max-width: 44px" src="https://raw.githubusercontent.com/jpmorganchase/modular/main/docs/img/modular-hero.svg"> &nbsp; Modular</h1>

  <p><strong>Scaled Web Engineering</strong>. Where Libraries, micro-frontends & apps coexist together and tooling is a first-class citizen.</p>
</div>

`modular` is a collection of tools and guidance to enable UI development at
scale. It is derived from work at JP Morgan to enable development in a single
repository by many teams.

It provides a `modular` CLI to scaffold and develop a new application from
scratch, as well as commands to add and manage further modules.

## Pre-requisites

See the [compatibility page](./compatibility.md).

## Getting Started

```bash
  yarn create modular-react-app my-new-modular-project [--verbose] [--prefer-offline] [--repo]
```

Bootstraps a new project, configured to use
[Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

This also creates a workspace named 'app' which is a new
[modular app](./package-types) written in
[TypeScript](https://www.typescriptlang.org/).

It supports three flags:

- `--verbose` enables verbose `yarn` and `modular` logging.
- `--prefer-offline` will prefer locally cached `node_modules` versions over
  those from your remote registry.
- `--repo <value>` will toggle whether a new `git` repo is created and the
  initial files commited.

## Commands

- [`add`](./commands/add.md)
- [`build`](./commands/build.md)
- [`start`](./commands/start.md)
- [`test`](./commands/test.md)
- [`typecheck`](./commands/typecheck.md)
- [`lint`](./commands/lint.md)
- [`workspace`](./commands/workspace.md)
- [`check`](./commands/check.md)

## Concepts

- [Micro-frontends](./concepts/microfrontends.md)
- [Configuration](./configuration.md)
- [Package types](./package-types)
- [Linting](./concepts/linting.md)

## How to

- [`Create a Template`](./how-to/create-template.md)
- [`Convert Existing CRA Project`](./how-to/convert-react-app.md)
- [`Rename a Modular Package`](./how-to/rename-package.md)
