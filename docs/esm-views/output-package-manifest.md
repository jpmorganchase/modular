---
parent: ESM Views
nav_order: 4
title: Output package manifest
---

# Output package manifest

Every build of an ESM view will generate a package manifest (`package.json`),
which will contain a selection of the original `package.json` fields, plus a set
of added / modified fields:

- [`style`](https://jaketrent.com/post/package-json-style-attribute): the
  location of the js bundle (example:
  `"style": "static/css/main.c6ac0a5c.css"`), useful for a host application to
  dynamically load the styles and add them to the page `<head>` or the
  [adopted stylesheet](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
- [`styleImports`](./external-css-imports.md): An array of external CSS
  resources that the esm-view needs to import. Useful for host applications to
  load external CSS collaboratively (i.e. deduplicate common CSS when loading
  many esm-views)
- [`module`](https://github.com/dherman/defense-of-dot-js/blob/f31319be735b21739756b87d551f6711bd7aa283/proposal.md):
  the location of the js bundle (example:
  `"module": "static/js/main.5077b483.js"`), useful for a host application to
  dynamically load the ESM view and render it in a React tree.
- [`dependencies`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies):
  an object containing all the dependencies imported in the package source
  (including the hoisted ones) and their correspondent version ranges.
- [`bundledDependencies`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bundleddependencies):
  an array of bundled dependencies. Since `dependencies` contains all the
  dependencies (bundled and not bundled), it is always possible to know which
  dependencies were rewritten and which were bundled.
