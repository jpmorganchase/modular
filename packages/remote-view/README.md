# RemoteView

`<RemoteView />` is a Modular React component that enables the micro-frontend
pattern using Modular [ESM views](https://modular.js.org/esm-views/).

## Features

- Build distributed UIs using the microfrontend pattern, thanks to Modular
  [ESM Views](https://modular.js.org/esm-views/) and an
  [ESM CDN](https://modular.js.org/esm-views/esm-cdn/)
- Supports loading local and global CSS
- Declaratively fall back to iframes
- Compatible with any ESM CDN

## Getting Started

Modular `<RemoteView>`s work by
[dynamically importing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
your Modular [ESM Views](https://modular.js.org/esm-views) and natively
rendering them into your React tree.

To achieve this, `<RemoteView>` expects to load ESM Views from an ESM CDN, which
exposes code as a native ES Module, plus accompanying files such as static CSS
and the `package.json`.

This approach enables the microfrontend pattern, which can also be thought as
distributed UIs.

## Example

Load (dynamically import) and render a set of
[esm-cdn-hosted](https://modular.js.org/esm-views/esm-cdn/) views:

```jsx
import React, { useState } from 'react';
import { RemoteViewProvider, RemoteView } from '@modular-scripts/remote-view';

function MyPortal() {
  // In practice, URLs to your remote ESM views can be fetched from a server
  const [remoteViews, addRemoteView] = useState([
    'https://cdn.example.com/esm-view-1/index.js',
    'https://cdn.example.com/esm-view-2/index.js',
  ]);

  return (
    <RemoteViewProvider>
      {remoteViews.map((v, key) => (
        <section key={key}>
          <RemoteView baseUrl={v} />
        </section>
      ))}
    </RemoteViewProvider>
  );
}
```

Provide `loadWithIframeFallback` prop to trigger the iframe fallback:

```jsx
// Use an iframe fallback for one particular view
function determineFallbackCases(manifest: MicrofrontendManifest) {
  if (manifest.name === '@myscope/example-module') {
    return true;
  }

  return false;
}

return (
  <RemoteViewProvider>
    {remoteViews.map((v, key) => (
      <section key={key}>
        <RemoteView
          baseUrl={v}
          loadWithIframeFallback={determineFallbackCases}
        />
      </section>
    ))}
  </RemoteViewProvider>
);
```

## API

`<RemoteView />`

| Prop                     | Type                                                      | Required? | Description                                                                                        | Default     |
| ------------------------ | --------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- | ----------- |
| `baseUrl`                | String (URL)                                              | Yes       | URL to the remote view. Can be either an ESM view URL on your ESM CDN, or an iframe URL            | N/A         |
| `loadWithIframeFallback` | Function `fn(manifest: MicrofrontendManifest) => boolean` | No        | Optional function to determine if an iframe fallback should be used in place of a React component. | `undefined` |

`MicrofrontManifest` represents the `package.json` of an ESM View served over an
ESM CDN. This includes fields like the package `name`, `style`, `styleImports`
and more - see `packages/modular-types/src/types.ts` for the full list of fields
that are expected.

You can read more about how CSS is handled on the
[Modular docs](https://modular.js.org/esm-views/external-css-imports/).

## Build

To [build](https://modular.js.org/commands/build) this package, run:

```bash
yarn modular build @modular-scripts/remote-view
```

## Compiling ESM view fixtures

To test `<RemoteView />`, at least 2 test ESM views are needed. To this end, we
use 2 pre-compiled ESM views in the `__fixtures__/remote-view/output` directory.
This approach is faster and simpler than building them on-the-fly in test.

For both test ESM views (`esm-view-card` and `esm-view-list`), we have set
`"externalCdnTemplate": "http://localhost:8484/[name]@[version]"` in the Modular
config so that we do not point to esm.sh in the output (we do not want to rely
on esm.sh in test).

To re-compile these test ESM views, the source code from
`__fixtures__/remote-view/packages` must be copied into `packages` (so that
Modular can see them) and run:

```bash
yarn modular build esm-view-card
yarn modular build esm-view-list
```

Following this, copy the output from `dist` into
`__fixtures__/remote-view/output` and the new output will be available in test.
Also, remember to delete the two packages from `packages/`.
