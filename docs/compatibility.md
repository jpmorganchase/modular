---
nav_order: 800
---

# Compatibility

## Package managers

Modular is based on
[Yarn Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). It uses
the `yarnpkg` command under the hood. At the moment, Modular is developed and
tested with [Yarn Classic (v1)](https://classic.yarnpkg.com). Other versions of
Yarn have different levels of support.

### Yarn v2

Yarn v2 is not supported by Modular, due to
[PnP](https://yarnpkg.com/features/pnp) and Yarn's choice to not backport the
fix to
[this issue](https://github.com/yarnpkg/berry/issues/2232#issuecomment-818514929).

### Yarn v3

Yarn v3 is partially supported; we are actively trying to support more features.

All Modular commands and functionality should work as expected.

The project's `.yarnrc.yml` must include the `nodeLinker` property set to
`node-modules` as we do not support Plug'n'Play.

#### Unsupported Features:

- Plug'n'Play
- Nested worktrees,

If you find any example of v3 features which cause Modular to fail, please
[let us know](https://github.com/jpmorganchase/modular/issues).

### Yarn v4 and beyond

We aim to support future versions of Yarn, and we've successfully used Modular
with an unstable release candidate of Yarn 4. If there's something we don't
support properly, please
[let us know](https://github.com/jpmorganchase/modular/issues).

## Node versions

Modular is tested on the current
[Long Term Support versions of Node.js: v16, v18 and v20](https://github.com/nodejs/release#release-schedule).
Node 16 is supported from version `16.10.0` onwards.

## Platforms

Modular is tested on `ubuntu-latest` and `windows-latest`
[Github Hosted Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources).
