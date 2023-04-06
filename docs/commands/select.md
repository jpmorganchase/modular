---
parent: Commands
title: modular select
---

# `modular select [options] [packages...]`

Filter workspaces based on the name of the `packages` or the `options` provided
and output an array of package names. This is the same algorithm that powers
package selection in all other commands.

When `packages` is empty and no selective options have been specified (for
example when running `yarn modular select`), all packages in the monorepo will
be selected.

For example, if you have three packages:

```
my-repo/
├─ packages/
│  ├─ pkg-a
│  ├─ pkg-b
│  ├─ pkg-c
```

Then executing `yarn modular select` would return:

```json
["pkg-a", "pkg-b", "pkg-c"]
```

The `options` allow you to filter packages selectively. For example, if `pkg-a`
depends on `pkg-b` and you exectue:

```
yarn modular select pkg-a --descendants
```

The result will be:

```json
["pkg-a", "pkg-b"]
```

Packages are selected in no particular order by default, but when the
 `--buildable` option is provided, only buildable packages are selected in
build order and presented as an array of subarrays, where each subarray can be
built in parallel.

For more information on which packages are buildable or non-buildable and how
selection works, please see the [`modular build`](./build.md) documentation.

It is not necessary to use `select` to determine which packages need to be
built or tested when executing the other Modular commands such as
[`modular build`](./build.md) or [`modular test`](./test.md). The logic
implemented in the `select` command is executed by all the other Modular
commands automatically. The `select` command is useful in cases where the user
wants to use the selective algorithms of Modular to implement a custom
strategy to build Modular workspaces, for example in multi-node CI pipelines
where each task could be run on a different machine.

## Options:

`--changed`: Select only the packages whose workspaces contain files that have
changed. Files that have changed are calculated comparing the current state of
the repository with the branch specified by `compareBranch` or, if
`compareBranch` is not set, with the default git branch.

`--compareBranch`: Specify the comparison branch used to determine which files
have changed when using the `changed` option. If this option is used without
`changed`, the command will fail.

`--descendants`: Select the packages specified by the `[packages...]` argument
and/or the `--changed` option and additionally select all their descendants
(i.e. the packages they directly or indirectly depend on) in dependency order.

`--ancestors`: Select the packages specified by the `[packages...]` argument
and/or the `--changed` option and additionally select all their ancestors (i.e.
the packages that have a direct or indirect dependency on them) in dependency
order.

`--verbose`: Show verbose information

`--buildable`: Select only buildable packages and output a 1-level nested array
of subarrays in build order, where packages inside subarrays can be built in
any order and subarrays must be built in series, according to their order in
the array. For example, suppose that `modular select` outputs this sequence of
packages:

```js
['a', 'b', 'c', 'd-not-buildable', 'e'];
```

Where `d-not-buildable` is a non-buildable package (for example, a
[source type](../package-types/source.md)). One possible output of the same
command with the `--buildable` option, `modular-select --buildable` might be:

```js
[['a', 'b'], ['c'], ['e']];
```

where `d-not-buildable` is omitted, the array order determines the build order
and the subarrays signal that the contained packages can be built in any order
(or even in parallel). In particular, the last example determines the following
steps to build the listed packages:

- Start by building packages `a` and `b` either sequentially or in parallel.
- Next, build package `c` once both `a` and `b` have been built.
- Finally, build package `e` once `c` has been built.

Modular's build order is explained and exemplified in
[the build command page](../commands/).
