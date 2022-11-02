---
parent: ESM Views
nav_order: 5
title: External CSS imports
---

# External CSS imports

CSS imports pointing to an external package (for example:
[`import 'regular-table/dist/css/material.css'`](https://www.npmjs.com/package/regular-table)
) will be rewritten to a CDN URL (for example, using Skypack,
`https://cdn.skypack.dev/regular-table@[version]/dist/css/material.css`) and:

- Listed in the `style-cdn` array field in the output manifest, so that the
  loader (often a host application) can scan the manifest and load the CSS in a
  collaborative way (for example, a host application can ensure that styles
  required by many esm-views are loaded only once).
- Included in a `link` element inside the generated `index.html`, so that they
  are loaded without any intervention when the esm-view is served standalone.

Please note that this applies only to external CSS `import`ed in typescript /
javascript code; CSS `@import` rules will not be processed. A good rule with
esm-views is to use `.css` files only for local css and `import` statements for
style from external dependencies.
