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

- Listed in the `styleImports` array field in the output manifest, so that the
  loader (often a host application) can scan the manifest and load the CSS in a
  collaborative way (for example, a host application can ensure that styles
  required by many esm-views are loaded only once).
- Included in a `link` element inside the generated `index.html`, so that they
  are loaded without any intervention when the esm-view is served standalone.

Please note that this applies only to external CSS `import`ed in typescript /
javascript code; CSS `@import` rules will not be processed. A good rule with
esm-views is to use `.css` files only for local css and `import` statements for
style from external dependencies.

For example, code such as:

```ts
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from '@jpmorganchase/uitk-lab';
import { Button, Card, Panel, ToolkitProvider } from '@jpmorganchase/uitk-core';
import { AddIcon, RemoveIcon } from '@jpmorganchase/uitk-icons';
import '@jpmorganchase/uitk-theme/index.css';
import './EsmView.css';

export default function EsmView(): JSX.Element {
  // ...
}
```

Will result in this `index.html`, where the imported
`@jpmorganchase/uitk-theme/index.css` is rewritten to CDN and loaded in a `link`
tag (along with the local CSS):

```html
<!DOCTYPE html>
<html>
  <head>
    <link
      rel="stylesheet"
      href="https://esm.sh/@jpmorganchase/uitk-theme@0.5.0/index.css"
    />
    <link rel="stylesheet" href="/static/css/main.ca23ca56.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/static/js/_trampoline.js"></script>
  </body>
</html>
```

And this output manifest, where the imported
`@jpmorganchase/uitk-theme/index.css` is rewritten to CDN and listed in the
`styleImports` (along with the local CSS in `style`):

```json
{
  "name": "microfrontend",
  "version": "1.0.0",
  "modular": {
    "type": "esm-view"
  },
  "dependencies": {
    "react": "^18.2.0",
    "@jpmorganchase/uitk-lab": "latest",
    "@jpmorganchase/uitk-core": "latest",
    "@jpmorganchase/uitk-icons": "latest",
    "@jpmorganchase/uitk-theme": "latest"
  },
  "bundledDependencies": [],
  "module": "/static/js/main.ebf8cd02.js",
  "style": "/static/css/main.ca23ca56.css",
  "styleImports": ["https://esm.sh/@jpmorganchase/uitk-theme@0.5.0/index.css"]
}
```

Finally, the generated JS will **not** contain the external style import:

```js
import*as e from"https://esm.sh/react@18.2.0";
import*as t from"https://esm.sh/@jpmorganchase/uitk-lab@0.6.0";
import*as a from"https://esm.sh/@jpmorganchase/uitk-core@0.6.0";
import*as l from"https://esm.sh/@jpmorganchase/uitk-icons@0.4.1";
var n={975:()=>{}},r={};function o(e){var t=r[e];
// ... more minified code follows
```
