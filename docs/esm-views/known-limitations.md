---
parent: ESM Views
nav_order: 100
title: Known limitations of ESM Views
---

# Known limitations of ESM Views

## Dependencies to be rewritten must be referenced in the esm-view code and its manifest

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
ependencies. For example: if your esm-view doesn't import React, but one of its
local (workspace) dependencies does, and React is in allow list, the React
dependency **won't be a candidate for rewriting**.

## Dependencies in the block list can still come from the CDN, if they are referenced in a CDN dependency

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
