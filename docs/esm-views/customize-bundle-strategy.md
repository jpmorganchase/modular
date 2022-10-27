---
parent: ESM Views
nav_order: 3
title: Customize bundling strategy
---

# Customize bundling / rewriting strategy

By default, all external dependencies are rewritten to a CDN URL and none is
bundled. This logic can be controlled using two environment variables:

1. `EXTERNAL_ALLOW_LIST` is a comma-separated string that specifies which
   dependencies are allowed to be rewritten to the CDN; if not specified, its
   default value is `**` ( -> all dependencies are rewritten)
2. `EXTERNAL_BLOCK_LIST` is a comma-separated string that specifies which
   dependencies are **not** allowed to be rewritten to the CDN; if not specified
   its default value is empty ( -> no dependency excluded, i.e. all dependencies
   are rewritten)

The allow / block lists are parsed and processed according to this logic:

- If a dependency is local to the workspace and the version specified in the
  depending `package.json` matches the version in the dependency `package.json`
  (either exactly or by wildcard), it will be bundled
- If a dependency is only in the allow list, it will be rewritten
- If a dependency is only in the block list, it will be bundled
- If a dependency is in both lists, it will be bundled (`EXTERNAL_BLOCK_LIST`
  wins)
- If a dependency is in none of the lists, it will be bundled (but remember that
  all dependencies are in allow list by default)

The dependencies will be reflected in the
[output package manifest](./output-package-manifest.md) (`package.json`)
according to these rules:

- All dependencies and their versions are listed in the `dependencies` field, as
  an object
- The dependencies that are bundled are listed in the `bundledDependencies`
  field, as an array

It is possible to specify wildcards in the block and allow list.
[Micromatch](https://github.com/micromatch/micromatch) syntax is supported.
