<div align="center">
  <h1><img height="38px" width="44px" style="height: 38px; max-width: 44px" src="https://raw.githubusercontent.com/jpmorganchase/modular/main/docs/img/modular-hero.svg"> &nbsp; Modular</h1>

  <p><strong>Scaled Web Engineering</strong>. Where libraries and micro-frontends coexist together and tooling is a first-class citizen.</p>
</div>

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?)](https://github.com/jpmorganchase/modular/blob/main/CONTRIBUTING.md)
[![NPM version](https://img.shields.io/npm/v/modular-scripts.svg)](https://www.npmjs.com/package/modular-scripts)
![Static](https://github.com/jpmorganchase/modular/actions/workflows/static.yml/badge.svg)
![Tests](https://github.com/jpmorganchase/modular/actions/workflows/test.yml/badge.svg)
[![Coverage](https://coveralls.io/repos/github/jpmorganchase/modular/badge.svg?branch=main)](https://coveralls.io/github/jpmorganchase/modular?branch=main)

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

See the [compatibility page](https://modular.js.org/compatibility/).

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
  initial files committed.

## Commands

More documentation about modular commands is
[here](https://modular.js.org/commands/).

## Configuration

Modular is based around the idea of minimal configuration - however
documentation for the options available is
[here](https://modular.js.org/configuration/).
