---
parent: Building your Apps
title: ESM Views
---

Modular builds packages of `"type": "esm-view"` as
[ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules),
rewriting all of a subset of their imports to make use of a configurable ESM CDN
(e.g. [Skypack](https://www.skypack.dev) or [esm.sh](https://esm.sh/)). This
allows users to implement the
[microfrontend pattern](../concepts/microfrontends.md), by creating an artifact
that can be
[`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)ed
at runtime by a host application, or loaded stand-alone thanks to the automatic
generation of the `index.html` and trampoline file.

## Why ESM Views need an external CDN

ESM Views are designed to exclude external dependencies from the output bundle
and `import` them at runtime. This simplifies the build process by removing the
need for explicit dependency de-duplication as the browser will do so
automatically though its cache so long as all dependencies are served from the
same origin, i.e. a single CDN.

This is particularly useful for a host application that lazily loads several
independently developed and hosted applications onto a browser tab at runtime;
If each of those applications naively bundled all their dependencies this would
result in inefficiencies as a copy of each dependency that is used by more than
one application would be included in each bundle. For stateful dependencies like
React that don't allow multiple instances of themselves in the same page
context, this would cause crashes. Importing these external dependencies from a
CDN, instead, means that every shared dependency is loaded from the server
exactly once at runtime and re-used in every point of the code where it's
imported. This improves efficiency and, since every dependency is loaded and
evaluated only once, it plays well with stateful libraries.

## How to build

ESM views are built with the [`modular build`](../commands/build.md) command.
The default behaviour when building an ESM view is:

1. All the non-local `import`s in the package's `src` directory are extracted
   and matched with their version in the package's `package.json` or the
   `package.json` in the repository root and with their exact version in the
   repo's lockfile.
2. The main entrypoint (as defined in the ESM view's `package.json`'s `main`
   field) and its local imports are bundled in a single file.
3. All the `import` statements to non-local dependencies encountered in the
   process are rewritten to `import` from an external ESM CDN (by default
   https://www.skypack.dev/), using the versions extracted in step 1. By
   default, versions extracted from `package.json` will be used, but users can
   customize the rewrite template to use versions from the lockfile instead.
4. All the local CSS is bundled in a single file.
5. The `dist` directory is generated, containing:
   - The js file
   - The css file
   - A [package manifest](#package-manifest) (`package.json`) file containing:
     - The location of the js bundle (`"module"` field)
     - The location of the css bundle (`"style"` field)
     - An object with the whole set of dependencies and their version ranges
       (`"dependencies"` field)
     - An array of bundled dependencies (`bundledDependencies` field)
   - A synthetically generated `index.html` file, linking the trampoline file
     and the css bundle
   - A synthetically generated trampoline file, dynamically `import`ing the js
     bundle and `React.render`ing its default export to a `#root` div.

The ESM view build result can either be
[dynamically imported](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)
from a host application,
([including the css bundle](https://web.dev/css-module-scripts/)) or served
statically as a standalone application (for example, using `modular serve` or
from a web server).

## Customise the ESM CDN

You can specify a CDN template to rewrite dependencies using the environment
variable `EXTERNAL_CDN_TEMPLATE`.

For example:

- The default template for the [Skypack](https://www.skypack.dev/) public CDN is
  `EXTERNAL_CDN_TEMPLATE="https://cdn.skypack.dev/[name]@[resolution]"`
- A valid template to work with the esm.sh public CDN can be specified with
  `EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[version]"`

These are the substrings that are replaced in the template:

- `[name]` is replaced with the name of the imported dependency
- `[version]` is replaced with the version of the imported dependency as
  extracted from the package's or the root's (hoisted) `package.json`.
- `[resolution]` is replaced with the version of the imported dependency as
  extracted from the yarn lockfile (`yarn.lock`).

## Customise bundling / rewriting strategy

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
  dependent package.json matches the verion in the dependency package.json
  (either exactly or by wildcard), it will be bundled
- If a dependency is only in the allow list, it will be rewritten
- If a dependency is only in the block list, it will be bundled
- If a dependency is in both lists, it will be bundled (`EXTERNAL_BLOCK_LIST`
  wins)
- If a dependency is in none of the lists, it will be bundled (but remember that
  all dependencies are in allow list by default)

The dependencies will be reflected in the output package manifest
(`package.json`) according to these rules:

- All dependencies and their versions are listed in the `dependencies` field, as
  an object
- The dependencies that are bundled are listed in the `bundledDependencies`
  field, as an array

It is possible to specify wildcards in the block and allow list.
[Micromatch](https://github.com/micromatch/micromatch) syntax is supported.

## Package manifest

Every build of an ESM view will generate a package manifest (`package.json`),
which will contain a selection of the original `package.json` fields, plus a set
of added / modified fields:

- [`style`](https://jaketrent.com/post/package-json-style-attribute): the
  location of the js bundle (example:
  `"style": "static/css/main.c6ac0a5c.css"`), useful for an host to dynamically
  load the styles and add them to the page `<head>` or the
  [adopted stylesheet](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
- [`module`](https://github.com/dherman/defense-of-dot-js/blob/f31319be735b21739756b87d551f6711bd7aa283/proposal.md):
  the location of the js bundle (example:
  `"module": "static/js/main.5077b483.js"`), useful for an host to dynamically
  load the ESM view and render it in a React tree.
- [`dependencies`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies):
  an object containing all the dependencies imported in the package source
  (including the hoisted ones) and their correspondent version ranges.
- [`bundledDependencies`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bundleddependencies):
  an array of bundled dependencies. Since `dependencies` contains all the
  dependencies (bundled and not bundled), it is always possible to know which
  dependencies were rewritten and which were bundled.

## External CSS imports

CSS imports pointing to an external package (for example:
[`import 'regular-table/dist/css/material.css'`](https://www.npmjs.com/package/regular-table)
) will be rewritten to a CDN URL (for example, using Skypack,
`https://cdn.skypack.dev/regular-table@[version]/dist/css/material.css`). The
only difference is that they will be rewritten in the bundle as code that
applies the CSS into the page, either by simply adding it to the `head` or,
depending on the build `target`, using
[CSS Module scripts](https://web.dev/css-module-scripts/) and adding the script
to the
[adopted stylesheet](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).

This feature is experimental and feedback is appreciated.
