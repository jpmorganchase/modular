---
parent: ESM Views
nav_order: 1
title: How to build ESM Views
---

# How to build ESM Views

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
   - A [package manifest](./output-package-manifest.md) (`package.json`) file
     containing:
     - The location of the js bundle (`"module"` field)
     - The location of the css bundle (`"style"` field)
     - An object with the whole set of dependencies and their version ranges
       (`"dependencies"` field)
     - An array of bundled dependencies (`bundledDependencies` field)
   - A synthetically generated `index.html` file, linking the trampoline file
     and the css bundle. This file is included in the `dist` directory of the
     esm-view.
   - A synthetically generated trampoline file (`_trampoline.js`), dynamically
     `import`ing the js bundle and `React.render`ing its default export to a
     `#root` div. This file is included in the `dist/static/js` directory of the
     esm-view

The ESM view build result can either be
[dynamically imported](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)
from a host application,
([including the css bundle](https://web.dev/css-module-scripts/)) or served
statically as a standalone application (for example, using `modular serve` or
from a web server).
