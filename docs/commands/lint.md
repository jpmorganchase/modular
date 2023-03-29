---
parent: Commands
title: modular lint
---

# `modular lint [options] [regexes...]`

`modular lint` without arguments or options will check the diff between the
current branch and your remote origin default branch (i.e. `master` or `main`)
and only lint the `.ts`, `.tsx`, `.js`, `.jsx` files that have changes. When in
CI without arguments or options or when the `--all` option is provided, it will
lint the entire codebase. When `--staged` is provided, it will only lint the
files staged on git.

Alternatively, when it is invoked with one or more selective options
(`--packages`, `--ancestors`, `--descendants` or `--changed`), it will lint all
the source code files in the provided `--packages`, optionally agumenting the
set of packages by adding their ancestors (`--ancestors`), their descendants
(`--descendants`) or the files that have changed (`--changed`), calculated
comparing the current state of the git repository with the branch specified by
`--compareBranch` or, if `--compareBranch` is not set, with the default branch.

It uses your project eslint config to lint and jest runner to report on the lint
status of each file (`PASS` or `FAIL`). If a file has a lint warning, the
command will be marked as failed, with printed eslint errors for each
warning/error.

## Default behaviour

`modular lint` without arguments or options will:

- default to lint the `git diff` between the current branch and the remote
  origin's default branch when not in CI
- default to lint everything (essentially like `--all`) when in CI

## Options:

`--all`: Lints the entire codebase (not compatible with `--staged` and with the
Selective Options)

`--staged`: Lints only files staged on git (not compatible with `--all` and with
the Selective Options)

`--fix`: Allows eslint to fix the errors and warnings that do not require manual
intervention wherever possible. Restages any fixed files that were previously
staged when used in combination with `--staged`.

### Selective Options

`--packages [packages...]`: A list of one or more packages to lint. Can be
combined with all the other selective options.

`--ancestors`: Take the packages specified via `--packages` or `--changed` and
add their ancestors (i.e. the packages that have a direct or indirect dependency
on them) to the lint list.

`--descendants`: Take the packages specified via `--packages` or `--changed` and
add their descendants (i.e. the packages they directly or indirectly depend on)
to the lint list.

`--changed`: Add all the packages whose workspaces contain files that have
changed, calculated comparing the current state of the git repository with the
branch specified by `compareBranch` or, if `compareBranch` is not set, with the
default branch.

`--compareBranch <branch>`: Specify the comparison branch used to determine
which files have changed when using the `changed` option. If this option is used
without `changed`, the command will fail.
