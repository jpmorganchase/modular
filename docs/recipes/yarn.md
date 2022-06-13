---
title: Yarn
parent: Recipes
---

# How we support Yarn

Modular uses whatever `yarnpkg` command is installed by the user under the hood.
At the moment, Modular is developed and tested with
[Yarn Classic (v1)](https://classic.yarnpkg.com). Other versions of Yarn have
different levels of support:

- Yarn v2 is not supported by Modular, due to
  [PnP](https://yarnpkg.com/features/pnp).
- Yarn v3 is supported partially; we are actively trying to support more and
  more features of Yarn v3, but at the moment some features, such as nested
  worktrees, are not supported. If you find any example of v3 features which
  cause Modular to fail, please
  [let us know](https://github.com/jpmorganchase/modular/issues).
- Future versions of Yarn are not supported at the moment.
