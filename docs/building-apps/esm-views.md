---
parent: Building your Apps
title: ESM Views (micro frontends)
---

modular builds packages of `"type": "view"` as
[ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules),
rewriting all of a subset of their imports to make use of a configurable esm cdn (e.g. 
[Skypack](https://www.skypack.dev) or [esm.sh](https://esm.sh/)). This allows users to
implement the [microfrontend pattern](../concepts/microfrontends.md), by
creating an artefact that can be
[`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)ed
at runtime by an host application, or loaded stand-alone thanks to the automatic
generation of a index.html and trampoline file.

## How to build

Views are built with the [`modular build`](../commands/build.md) command. The
default behaviour when building a view is:

1. All the non-local `import`s in the package's `src` directory are extracted
   and matched with their version in the package's or the package's root
   `package.json`
2. The main endpoint (as defined in the view's `package.json`'s `main` field)
   and its local imports are bundled in a single file
3. All the non-local dependencies encountered in the process are rewritten to
   `import` from an external ESM CDN (by default https://www.skypack.dev/),
   using the versions extracted in step 1
4. All the local CSS is bundled in a single file
5. The `dist` directory is generated, containing:
   - the js file
   - the css file
   - a package manifest (`package.json`) file containing
     ([see also below](#package-manifest)):
     - the location of the js bundle (`"module"` field)
     - the location of the css bundle (`"style"` field)
     - an object with the whole set of dependencies and their version ranges
       (`"dependencies"` field)
     - an array of bundled dependencies (`bundledDependencies` field)
   - a synthetically generated `index.html` file, linking the trampoline file
     and the css bundle
   - a synthetically generated trampoline file, dynamically `import`ing the js
     bundle

The view build result can either be
[dynamically `import`ed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)
from an host application
([including the css bundle](https://web.dev/css-module-scripts/)) or served
statically as a standalone application (for example, using `modular serve`).

## Customise the ESM CDN

A custom template for the CDN used when rewriting can be specified. The template
is specified in the `EXTERNAL_CDN_TEMPLATE` environment variable and it is a
string in which the string `[name]` is replaced with the name of the imported
dependency and the string `[version]` is replaced with the version of the
imported dependency, as extracted from the package's or the root's (hoisted)
`package.json`

For example:

- The default template for the [Skypack](https://www.skypack.dev/) public CDN is
  `EXTERNAL_CDN_TEMPLATE="https://cdn.skypack.dev/[name]@[version]"`
- A valid template to work with the esm.sh public CDN can be specified with
  `EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[version]"`

## Customise bundling / rewriting strategy

By default, all external dependencies are rewritten to a CDN url and none are
bundled. This logic can be controlled using two environment variables:

- `EXTERNAL_ALLOW_LIST` is a comma-separated string that specifies which
  dependencies are allowed to be rewritten to CDN; if not specified, its default
  value is '\*' ( -> all dependencies are rewritten)
- `EXTERNAL_BLOCK_LIST` is a comma-separated string that specifies which
  dependencies are **not** allowed to be rewritten to CDN; if not specified its
  default value is '' ( -> no dependency excluded, i.e. all dependencies are
  rewritten)

The allow / block lists are parsed and processed according to this logic:

- If a dependency is only in the allow list, it will be rewritten
- If a dependency is only in the block list, it will be bundled
- If a dependency is in both lists, it will be bundled (`EXTERNAL_BLOCK_LIST`
  wins)
- If a dependency is in none of the lists, it will be bundled (but remember that
  all dependencies are in allow list by default)
- All the dependencies and their versions are listed in the packages's built
  package manifest (`package.json`) `dependencies` field, as an object
- The bundled dependencies are listed in the packages's built package manifest
  (`package.json`) `bundledDependencies` field, as an array

It is possible to specify wildcards in the block and allow list.
[Micromatch](https://github.com/micromatch/micromatch) syntax is supported.

## Package manifest

Every build of a view will generate a package manifest (`package.json`) in the
`dist` directory, which will contain a selection of the original `package.json`
fields, plus a set of added / modified fields:

- [`style`](https://jaketrent.com/post/package-json-style-attribute): the
  location of the js bundle (example:
  `"style": "static/css/main.c6ac0a5c.css"`), useful for an host to dynamically
  load the styles and add them to the page `<head>` or the
  [adopted stylesheet](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
- [`module`](https://github.com/dherman/defense-of-dot-js/blob/f31319be735b21739756b87d551f6711bd7aa283/proposal.md):
  the location of the js bundle (example:
  `"module": "static/js/main.5077b483.js"`), useful for an host to dynamically
  load the view and render it in a React tree.
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
) will be rewritten to a CDN url as normal packages (for example, using skypack,
`https://cdn.skypack.dev/regular-table@[version]/dist/css/material.css`). The
only difference is that they will be rewritten in the bundle as code that
applies the CSS into the page, either by simply adding it to the `head` or,
depending on the build `target`, using
[CSS Module scripts](https://web.dev/css-module-scripts/) and adding the script
to the
[adopted stylesheet](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
This feature is experimental and feedback is appreciated.
