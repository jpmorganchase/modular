---
parent: Commands
title: modular lint
---

# `modular lint`

`modular lint` will check the diff between the current branch and your remote
origin default branch (i.e. `master` or `main`) and only lint the `.ts`, `.tsx`,
`.js`, `.jsx` files that have changes.

It uses your project eslint config to lint and jest runner to report on the lint
status of each file (`PASS` or `FAIL`). If a file has a lint warning, the
command will be marked as failed, with printed eslint errors for each
warning/error.

When in CI, it will default to lint the entire codebase. When not in CI, it will
default to only lint the diffed files.

## Options:

`--all`: Lints the entire codebase

`--fix`: Allows eslint to fix the errors and warnings that do not require manual
intervention wherever possible
