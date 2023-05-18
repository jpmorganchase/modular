---
parent: Commands
title: modular typecheck
---

# `modular typecheck [options] [packages...]`

`modular typecheck` will programmatically report the semantic, syntactic, and
declaration type errors found in your code, based on your `tsconfig.json`.

In a CI environment, it will print condensed errors if they are present.

In non-CI environments, it will print the full details of the error, line, and
small snapshot of the offending line in question.

## Configuration

`modular typecheck` will respect the root `tsconfig.json`, but most
`compilerOptions` are ignored.

It should be noted that `modular typecheck` does not support package-level
`tsconfig.json` files, for backwards compatibility. Your IDE may still consume
these, but it is recommended to keep your TypeScript configuration in the root
`tsconfig.json`.

_Why does Modular restrict compilerOptions?_

`modular typecheck` aims to verify that the project's types are passing without
errors. Certain TypeScript features such as emitting output are not useful in
this scenario, so Modular has always applied a restricted set of
`compilerOptions`.

Although this approach has limited flexibility, it fits with Modular's goals and
brings certain advantages:

- Configuration is kept minimal and simple where possible
- The possibility of incompatible or conflicting `compilerOptions` between
  packages is avoided
- It enables the use of selective `modular typecheck` (i.e. supply package names
  and using flags such as `--ancestors`)

There are certain exceptions for practical use cases. The current allowlist is:

- [jsx](https://www.typescriptlang.org/tsconfig#jsx)
- [strict](https://www.typescriptlang.org/tsconfig#strict)

Some use cases may warrant new exceptions. If this is you, please file an issue
with the project for consideration.

## Command line options and arguments

### Default Behavior

`modular typecheck` without any options will typecheck all packages

### Non Modular Packages

If non modular packages (packages without a `modular` field in their
`package.json`) are included in the selection, Modular will attempt to run the
`typecheck` script in their `package.json` if specified.

### Selective Options

`--descendants`: Typecheck the packages specified by the `[packages...]`
argument and/or the `--changed` option and additionally typecheck all their
descendants (i.e. the packages they directly or indirectly depend on).

`--ancestors`: Typecheck the packages specified by the `[packages...]` argument
and/or the `--changed` option and additionally typecheck all their ancestors
(i.e. the packages that have a direct or indirect dependency on them).

`--changed`: Typecheck only the packages whose workspaces contain files that
have changed. Files that have changed are calculated comparing the current state
of the repository with the branch specified by `compareBranch` or, if
`compareBranch` is not set, with the default git branch.

`--compareBranch`: Specify the comparison branch used to determine which files
have changed when using the `changed` option. If this option is used without
`changed`, the command will fail.

### Other options

`--verbose`: Enables verbose logging within modular
