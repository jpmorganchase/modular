---
parent: ESM Views
nav_order: 5
title: External CSS imports
---

# External CSS imports

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
