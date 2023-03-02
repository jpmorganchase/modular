---
nav_order: 1
title: Modular
---

<div align="center">
  <h1><img height="38px" width="44px" style="height: 38px; max-width: 44px" src="https://raw.githubusercontent.com/jpmorganchase/modular/main/docs/img/modular-hero.svg"> &nbsp; Modular</h1>

  <p><strong>Scaled Web Engineering</strong>. Where libraries and micro-frontends coexist together and tooling is a first-class citizen.</p>
</div>

`modular` is a collection of tools and guidance to enable micro-frontend
development at scale. It is derived from work at JP Morgan to enable development
in large monorepositories owned by many teams.

It provides a CLI to:

- Scaffold new micro-frontends and libraries from scratch
- Provide ready-to-use, opinionated test, lint and build configurations for
  micro-frontends and libraries
- Provide tooling to incrementally and selectively run operations on
  monorepositories at scale

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

- [add](./commands/add.md)
- [build](./commands/build.md)
- [start](./commands/start.md)
- [test](./commands/test.md)
- [typecheck](./commands/typecheck.md)
- [lint](./commands/lint.md)
- [workspace](./commands/workspace.md)
- [check](./commands/check.md)

## Components

- [`<RemoteView />`](./components/remote-view.md)

## Concepts

- [Micro-frontends](./concepts/microfrontends.md)
- [Configuration](./configuration.md)
- [Package types](./package-types)
- [Linting](./concepts/linting.md)

## How to

- [Convert Existing CRA Project](./how-to/convert-react-app.md)
- [Create a Template](./how-to/create-template.md)
- [Rename a Modular Package](./how-to/rename-package.md)
