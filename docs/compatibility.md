---
nav_order: 800
---

# Compatibility

## Package managers

Modular is based on
[Yarn Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). It uses
the `yarnpkg` command under the hood. At the moment, Modular is developed and
tested with [Yarn Classic (v1)](https://classic.yarnpkg.com). Other versions of
Yarn have different levels of support:

- Yarn v2 is not supported by Modular, due to
  [PnP](https://yarnpkg.com/features/pnp).
- Yarn v3 is supported partially; we are actively trying to support more and
  more features of Yarn v3, but at the moment some features, such as nested
  worktrees, are not supported. If you find any example of v3 features which
  cause Modular to fail, please
  [let us know](https://github.com/jpmorganchase/modular/issues).
- Future versions of Yarn are not supported at the moment.

## Node versions

Modular is tested on the latest three
[Long Term Support versions of Node.js (v14, v16 and v18)](https://github.com/nodejs/release#release-schedule).
Node.js v14 is supported from version `14.18.0` onwards, while Node 16 is
supported from version `16.10.0` onwards.

## Platforms

Modular is tested on `ubuntu-latest` and `windows-latest`
[Github Hosted Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources).
