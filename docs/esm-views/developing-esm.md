---
parent: ESM Views
nav_order: 100
title: Developing with ESM Views
---

# Developing with ESM Views

## Differences between developing ESM Views and regular applications

### Dependencies to be rewritten must be referenced in the ESM View code and its manifest directly

When a dependency is rewritten, modular:

- Statically analyzes the code of the esm-view (`src/` directory) and extracts
  all the `import` statements
- Matches the imported dependencies to their versions in the esm-view's
  `package.json` and the root `package.json`
- Matches the imported dependencies + versions (found in the previous step) to
  their resolutions in `yarn.lock`
- Matches the collected dependencies with
  [the allow and block list](./customize-bundle-strategy.md) and filters out the
  unwanted dependencies according to allow / block rules
- Rewrites the remaining dependencies
  [according to their CDN template](./esm-cdn.md) throught the whole bundle

This means that if a dependency is not referenced in the source code or the
`package.json` of the esm-view, it won't be a candidate for rewriting: for
performance reasons, Modular won't analyze the source code of workspace
dependencies. For example: if your esm-view doesn't import React, but one of its
local (workspace) dependencies does, and React is in allow list, the React
dependency **won't be a candidate for rewriting**.

### Dependencies in the block list can still come from the CDN, if they are referenced in a CDN dependency

Suppose application `A` depends on package `B` and package `C`. Package `B` is
an external dependency on allow list that depends on package `C`, and package
`C` is an external dependency in block list that depends on nothing. When
application `A` is built with this configuration, application `C` will be
correctly bundled in the application bundle (since it's in block list) and
package `B` will be correctly rewritten to be imported from CDN (since it's in
allow list). But, since package `B` comes from the CDN, **its `C` dependency
will come from the CDN as well** (CDN packages are pre-built to use the CDN for
their own dependencies). The result, in this case, will be a bundle with two
copies of C, one fetched from the CDN and one bundled in the application.

### Peer dependencies are resolved at build time on the CDN

ESM CDNs essentially perform two tasks before serving a package that is
requested for the first time:

1. If the package is available as a CJS module, it is converted into an ES
   Module.
2. All the external dependencies found in the module are rewritten to point to
   the CDN itself. This is because
   [import maps are not dynamic](https://github.com/WICG/import-maps/issues/92),
   and there is no client-side way (yet) to route static imports.

This means that, if a package `A` has a `peerDependency` to package `B`, and `A`
is packaged on the CDN, it must resolve a version for package `B` and rewrite
the `import b from 'B'`(s) statements in A to an URL at _CDN build time_ (i.e.
when the package is requested for the first time). This means that the same
`peerDependency` in different CDN sub-dependencies of an ESM View can point to
different versions of the package, depending on the `peerDependency` ranges
specified in the sub-depenency manifest and the dependency versions available in
the registry in the moment when the package is built on the CDN. This is
particularly relevant in case the `peerDependency` in question is stateful:
suppose, for example, that one of your ESM Views depends on `react@17.0.1`, but
one of your dependencies on the CDN depend on `react@>16.8.0` (pretty common if
the dependency uses hooks). Depending on the moment that your dependency was
first requested from the CDN (and the version of your CDN), it can come with
_any_ version of React hardcoded, resulting in two different versions of React
loaded onto the page, hooks failing and the ESM view crashing.

This problem can be carefully solved on the CDN. There are two commonly used
approaches:

1. The CDN is aware of stateful dependencies and serves only one version of
   them, no matter which version was requested, essentially "lying" to the user.
   This is the approach taken by
   [Skypack](https://github.com/skypackjs/skypack-cdn/issues/88).
2. The CDN is not aware of stateful dependencies, but has a mechanism that
   allows requesting any dependency with a list of locked sub-dependencies. This
   essentially generates hashed dependencies (that can be reused) which are
   guaranteed to always use a particular version of a sub-dependency. This is
   the approach taken by
   [esm.sh with the external dependencies query option](https://github.com/esm-dev/esm.sh#specify-external-dependencies)

While approach 1 is completely up to the server and needs no additional
configuration to work, it has the disadvantage of not being flexible:
essentially, a bunch of well-known stateful libraries are locked to a version
that's "good enough". This is often not enough in terms of security and
guarantees of immutability (since the version can be only updated unilaterally,
on the CDN). In the previous example, it wouldn't matter what version of `react`
we specify in our manifest - the CDN would always serve a fixed version at
runtime to our application and all its dependencies.

Modular has a flexible approach to address rewriting, allowing users to specify
a custom CDN query template, in which query parameters can be specified
manually. This can be used to complement approach 2. For example,
`EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[resolution]?deps=react@17.0.1`
would lock React to the same version throught the whole dependency tree on the
CDN (i.e. any requested dependency that has a dependency on React and is built
on the CDN will be guaranteed to import `react@17.0.1` on the CDN at runtime, no
matter what its manifest file says). In the previous example, we don't care of
the `peerDependency` range of our dependencies, since we know that their `react`
will always point to `17.0.1`.

Modular also provides a [`[selectiveCDNResolutions] token`](./esm-cdn.md) in its
template, which automatically translates
[Yarn selective version resolutions](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/)
to lists of locked dependencies. For example, if you had these resolutions in
your package.json:

```json
{
  "resolutions": {
    "react": "17.0.1",
    "another-dependency": "2.3.7"
  }
}
```

and your environment contained
`EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[resolution]?deps=[selectiveCDNResolutions]`,
all your imports would be rewritten in this form:
`import someDependency from "https://esm.sh/some-dependency@7.7.7?deps=react@17.0.1,another-dependency@2.3.7"`
