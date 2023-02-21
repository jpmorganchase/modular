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
- Also supports Modular [apps](https://modular.js.org/package-types/) via
  iframes

## Getting Started

Install the RemoteView package:

```bash
yarn add @modular-scripts/remote-view
```

or

```bash
npm install @modular-scripts/remote-view
```

Modular `<RemoteView>`s work by
[dynamically importing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
your Modular [ESM Views](https://modular.js.org/esm-views) and natively
rendering them into your React tree.

To achieve this, `<RemoteView>` expects to load ESM Views from an ESM CDN, which
exposes code as a native ES Module, plus accompanying files such as static CSS
and the `package.json`.

This approach enables the microfrontend pattern, which can also be thought as
distributed UIs.

`<RemoteView />` also supports rendering non-ESM View modules by falling back to
iframes. In this case, an iframe is rendered in the React tree, instead of
another native React tree.

## Example

Load (dynamically import) and render a set of
[esm-cdn-hosted](https://modular.js.org/esm-views/esm-cdn/) views:

```tsx
import React, { useState } from 'react';
import {
  RemoteViewProvider,
  RemoteView,
  RemoteViewErrorBoundary,
} from '@modular-scripts/remote-view';

function MyPortal() {
  // In practice, URLs to your remote ESM views can be fetched from a server
  const [remoteViews, addRemoteView] = useState([
    'https://cdn.example.com/esm-view-1',
    'https://cdn.example.com/esm-view-2',
  ]);

  return (
    <RemoteViewProvider>
      {remoteViews.map((v, key) => (
        <section key={key}>
          <RemoteViewErrorBoundary>
            <RemoteView baseUrl={v} />
          </RemoteViewErrorBoundary>
        </section>
      ))}
    </RemoteViewProvider>
  );
}
```

Modular `esm-view`s will be dynamically loaded, whereas Modular `app`s are
loaded into an iframe. For more information on Modular types, check out the
[Package Types on the Modular docs](https://modular.js.org/package-types/).

It is also possible top load specific `esm-view`s into an iframe - provide
`loadWithIframeFallback` prop to trigger the iframe fallback:

```tsx
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
        <RemoteViewErrorBoundary>
          <RemoteView
            baseUrl={v}
            loadWithIframeFallback={determineFallbackCases}
          />
        </RemoteViewErrorBoundary>
      </section>
    ))}
  </RemoteViewProvider>
);
```

## Custom loader

You can customize the loading state of each `<RemoteView />` by providing a
`loading` prop:

```tsx
return (
  <RemoteViewErrorBoundary>
    <RemoteView
      baseUrl={myUrl}
      loadWithIframeFallback={determineFallbackCases}
      loading={<div>My custom loading component</div>}
    />
  </RemoteViewErrorBoundary>
);
```

By default, `<RemoteView />` will output a very simple loading message:
`<div>Loading</div>`.

## Custom error boundary

It's recommended to use `<RemoteViewErrorBoundary />` around `<RemoteView />`
because the runtime dynamic imports that happen mean that safety can never be
guaranteed.

`<RemoteViewErrorBoundary />` exposes an `errorFallback` prop which can be used
to customize the error boundary, which will receive a relevant error `message`,
if available:

```tsx
function CustomFallback({ message }: { message: string | undefined }) {
  return (
    <div>Custom error boundary component contained message: {message}</div>
  );
}

<RemoteViewErrorBoundary errorFallback={CustomFallback}>
  <RemoteView baseUrl={myUrl} loadWithIframeFallback={determineFallbackCases} />
</RemoteViewErrorBoundary>;
```

Alternatively, you bring your own error boundary.

## CSS

You can read more about how CSS is handled on the
[Modular docs](https://modular.js.org/esm-views/external-css-imports/).

## Security

Loading dynamic (especially remote, over http(s)) ES modules at runtime carries
certain risks and must be used carefully. Content loaded dynamically should only
ever be done from a trusted source.

End user input should **not** be used to determine content URLs (etc) and any
application of consuming modules at runtime should be centrally controled in a
secure environment. In other words, user input should not be allowed to modify
URLs that `<RemoteView />` will attempt to render.

There is also no guarantee of safety, which is why it is very strongly
recommended to use error boundaries. `<RemoteView />` attempts to render
whatever module it finds into your React tree, and this depends on runtime
imports actually returning valid React modules.

## API

`<RemoteViewProvider />`

Required provider that must wrap any `<RemoteView />` instances.

`<RemoteView />`

| Prop                     | Type                                                      | Required? | Description                                                                                        | Default              |
| ------------------------ | --------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| `baseUrl`                | String (URL)                                              | Yes       | URL to the remote view. Can be either an ESM view URL on your ESM CDN, or an iframe URL            | N/A                  |
| `loadWithIframeFallback` | Function `fn(manifest: MicrofrontendManifest) => boolean` | No        | Optional function to determine if an iframe fallback should be used in place of a React component. | `undefined`          |
| `loading`                | JSX.Element                                               | No        | Display a custom loading component whilst the remote view is being fetched and rendered            | `<div>Loading</div>` |

`MicrofrontendManifest` represents the `package.json` of an ESM View served over
an ESM CDN. This includes fields like the package `name`, `style`,
`styleImports` and more - see `packages/modular-types/src/types.ts` for the full
list of fields that are expected.

`<RemoteViewErrorBoundary />`

Recommended error boundary component to protect against runtime crashes

| Prop            | Type                | Required? | Description                                                                                                                                   | Default                                                                                      |
| --------------- | ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `errorFallback` | React.ComponentType | No        | Optional component to customize the error boundary. Accepts an optional `message` string prop which contains the error message, if available. | A simple div that outputs "Something went wrong" with an accompanying error message if found |

A custom [Error Boundary](https://reactjs.org/docs/error-boundaries.html) can
also be used in place of `<RemoteViewErrorBoundary />`.
