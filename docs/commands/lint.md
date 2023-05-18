---
parent: Commands
title: modular lint
---

# `modular lint [options] [packages...]`

`modular lint` without arguments or options will lint all modular packages in
the repository, and run any `lint` scripts specified in the `package.json` of
any non-modular packages.

`--diff` will check the diff between the current branch and your remote origin
default branch (i.e. `master` or `main`) and only lint the `.ts`, `.tsx`, `.js`,
`.jsx` files that have changes. When `--staged` is provided, it will only lint
the files staged on git.

Alternatively, when it is invoked with one or more selective options (packages
provided, `--ancestors`, `--descendants` or `--changed`), it will lint all the
source code files in the provided packages, optionally agumenting the set of
packages by adding their ancestors (`--ancestors`), their descendants
(`--descendants`) or the files that have changed (`--changed`), calculated
comparing the current state of the git repository with the branch specified by
`--compareBranch` or, if `--compareBranch` is not set, with the default branch.
Non modular packages will also be linted if they have a `lint` script specified
in their `package.json`.

It uses your project eslint config to lint and jest runner to report on the lint
status of each file (`PASS` or `FAIL`). If a file has a lint warning, the
command will be marked as failed, with printed eslint errors for each
warning/error.

## Default behavior

`modular lint` without arguments or options will lint all packages in the
repository, and run any `lint` scripts specified in the `package.json` of any
non-modular packages.

### Lint Unique Options:

These options are unique to the lint command and differ to other Modular command
options.

`--fix`: Allows eslint to fix the errors and warnings that do not require manual
intervention wherever possible. Restages any fixed files that were previously
staged when used in combination with `--staged`. Can be combined with any other
option.

`--compareBranch <branch>`: Specify the comparison branch used to determine
which files have changed when using the `changed` or `diff` option. If this
option is used without `changed` or `diff`, the command will fail.

The following options are not compatible with selective options, and cannot be
combined with each other.

`--staged`: Lints only files staged on git

`--diff`: Lints only files that have changed compared to the default branch or
branch specified with `--compareBranch`

`--regex [regexes...]`: A list of one or more regexes to select files to lint.

### Selective Options

`--ancestors`: Take the packages specified with the command or `--changed` and
add their ancestors (i.e. the packages that have a direct or indirect dependency
on them) to the lint list.

`--descendants`: Take the packages specified with the command or `--changed` and
add their descendants (i.e. the packages they directly or indirectly depend on)
to the lint list.

`--changed`: Add all the packages whose workspaces contain files that have
changed, calculated comparing the current state of the git repository with the
branch specified by `compareBranch` or, if `compareBranch` is not set, with the
default branch.
