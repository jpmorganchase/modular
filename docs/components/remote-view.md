---
parent: Components
title: <RemoteView />
---

# `<RemoteView />`

`<RemoteView />` is a Modular React component that enables the micro-frontend
pattern using Modular [ESM views](https://modular.js.org/esm-views/).

## Features

- Build distributed UIs using the microfrontend pattern, thanks to Modular
  [ESM Views](https://modular.js.org/esm-views/) and an
  [ESM CDN](https://modular.js.org/esm-views/esm-cdn/)
- Supports loading local and global CSS
- Flexible error handling
- Declaratively fall back to iframes
- Compatible with any ESM CDN
- Also supports Modular [apps](https://modular.js.org/package-types/) via
  iframes

## Prerequisites

To natively load ESM Views via `<RemoteView />`, it is required that:

1. The host (or "portal") application is a Modular
   [ESM View](https://modular.js.org/esm-views/) itself
2. The version of React matches between the host and each ESM View being loaded

This is due to the fact that React is a stateful dependency and loading
[more than 1 copy is unsupported](https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react).

Using an iframe fallback avoids this limitation and may be suitable depending on
your use-case.

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

To achieve this, `<RemoteView />` loads
[ESM View manifests](https://modular.js.org/esm-views/output-package-manifest/)
that are statically served from a CDN. Once a manifest is fetched,
`<RemoteView />` dynamically imports the ESM View's JS and CSS entrypoints and
renders them as part of the caller's React tree.

This approach enables the microfrontend pattern, which can also be thought as
distributed UIs.

`<RemoteView />` also supports rendering non-ESM View modules by falling back to
iframes. In this case, an iframe is rendered in the React tree, instead of a
native React subtree.

## Example

Load (dynamically import) and render a set of
[esm-cdn-hosted](https://modular.js.org/esm-views/esm-cdn/) views:

```jsx
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
      {remoteViews.map((url, key) => (
        <section key={key}>
          <RemoteViewErrorBoundary>
            <RemoteView url={url} />
          </RemoteViewErrorBoundary>
        </section>
      ))}
    </RemoteViewProvider>
  );
}
```

Modular [ESM Views](https://modular.js.org/esm-views) are dynamically loaded,
whereas Modular [Apps](https://modular.js.org/package-types/app/) are loaded
into an iframe. For more information on Modular types, check out the
[Package Types breakdown on the Modular docs](https://modular.js.org/package-types/).

## Fall back to iframes

It is also possible to load [ESM Views](https://modular.js.org/esm-views) (in
addition to [Apps](https://modular.js.org/package-types/app/)) into an iframe if
desired - provide `loadWithIframeFallback` prop to trigger the iframe fallback:

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
    {remoteViews.map((url, key) => (
      <section key={key}>
        <RemoteViewErrorBoundary>
          <RemoteView
            url={url}
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

```jsx
return (
  <RemoteViewProvider>
    <RemoteViewErrorBoundary>
      <RemoteView
        url={myUrl}
        loadWithIframeFallback={determineFallbackCases}
        loading={<div>My custom loading component</div>}
      />
    </RemoteViewErrorBoundary>
  </RemoteViewProvider>
);
```

By default, `<RemoteView />` outputs a very simple loading message:
`<div>Loading</div>`.

Alternatively, you bring your own error boundary.

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

## CSS

`<RemoteView />` automatically imports local and global CSS from ESM Views that
have been specified according to the
[Modular docs](https://modular.js.org/esm-views/external-css-imports/).

When an iframe fallback is used, this does not apply.

## Error handling

It is strongly recommended to wrap any usage of `<RemoteView />` with error
boundaries. There are two approaches you can take:

- Use the provided `<RemoteViewErrorBoundary />`, optionally customizing the
  content that is displayed
- Use your own error boundary

### Using the default error boundary

Outputs a default, simple error component displaying the error details

```jsx
return (
  <RemoteViewProvider>
    <RemoteViewErrorBoundary>
      <RemoteView url={url} />
    </RemoteViewErrorBoundary>
  </RemoteViewProvider>
);
```

The error fallback contains a simple output:

```jsx
return (
  <div>
    <span>
      Something went wrong for module at URL
      "https://cdn.example.com/views/foo".
    </span>
    <pre>{error.message}</pre>
  </div>
);
```

### Customizing the content of `<RemoteViewErrorBoundary />`

Supply the `content` prop. If the `error` prop is an instance of
`RemoteViewError`, will contain RemoteView-specific error details.

```tsx
function MyErrorContent({ error }: { error: Error | RemoteViewError }) {
  const isRemoteViewError = error instanceof RemoteViewError;

  return (
    <div>
      <H1>A custom error fallback component</H1>
      <Text>
        You can render and do anything you want, it's just a React component.
      </Text>
      <br />
      <Text>This error:</Text>
      <Text>
        Name: <code>{error.name}</code>
      </Text>
      <Text>
        Message: <code>{error.message}</code>
      </Text>
      {isRemoteViewError && (
        <Text>RemoteView could not load "{error.remoteViewUrl}"</Text>
      )}
    </div>
  );
}

return (
  <RemoteViewProvider>
    <RemoteViewErrorBoundary content={MyErrorContent}>
      <RemoteView url={url} />
    </RemoteViewErrorBoundary>
  </RemoteViewProvider>
);
```

### Using a fully custom error boundary

The RemoteView subtree can throw a `RemoteViewError` or other `Error` subclass.

If the error relates to the loading of the ESM View, a `RemoteViewError` should
be thrown. In all other cases (e.g. any crash in the React subtree after
rendering), an `Error` (of any subclass) will throw.

Use the standard class component `componentDidCatch` API to handle errors as you
choose.

```jsx
return (
  <RemoteViewProvider>
    <MyErrorBoundary>
      <RemoteView url={url} />
    </MyErrorBoundary>
  </RemoteViewProvider>
);
```

Examples of how errors can be handled, including recovery, can be seen in
[`packages/remote-view-demos`](https://github.com/jpmorganchase/modular/tree/main/packages/remote-view-demos).

## Examples

There are a range of examples implemented in
[`packages/remote-view-demos`](https://github.com/jpmorganchase/modular/tree/main/packages/remote-view-demos):

- 2 ESM Views loaded and rendering (aka "happy path")
- Iframe fallback
- All types of error handling
- How to recover a crashed view

## API

### `<RemoteViewProvider />`

Required provider that must wrap any `<RemoteView />` instances. Is responsible
for fetching ESM views.

| Prop                     | Type                                                      | Required? | Description                                                                                        | Default     |
| ------------------------ | --------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- | ----------- |
| `urls`                   | String[] (URLs)                                           | Yes       | URLs of the ESM Views you want to load                                                             | N/A         |
| `loadWithIframeFallback` | Function `fn(manifest: MicrofrontendManifest) => boolean` | No        | Optional function to determine if an iframe fallback should be used in place of a React component. | `undefined` |

### `<RemoteView />`

| Prop      | Type         | Required? | Description                                                                             | Default              |
| --------- | ------------ | --------- | --------------------------------------------------------------------------------------- | -------------------- |
| `url`     | String (URL) | Yes       | URL to the remote view. Can be either an ESM view URL on your ESM CDN, or an iframe URL | N/A                  |
| `loading` | JSX.Element  | No        | Display a custom loading component whilst the remote view is being fetched and rendered | `<div>Loading</div>` |

`MicrofrontendManifest` represents the `package.json` of an ESM View served over
an ESM CDN. This includes fields like the package `name`, `style`,
`styleImports` and more - see `packages/modular-types/src/types.ts` for the full
list of fields that are expected. You can also refer to the
[Modular docs on CSS imports](https://modular.js.org/esm-views/external-css-imports/).

### `<RemoteViewErrorBoundary />`

Recommended (but optional) error boundary component to protect against runtime
crashes. `<RemoteView />`s can throw during attempts to load ESM views
(unsupported manifests, unreachable manifests), but also inside the subtree that
is ultimately rendered, which is outside the control of `<RemoteView />`.

| Prop      | Type                | Required? | Description                                                                                                                     | Default                                                                              |
| --------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `content` | React.ComponentType | No        | Optional component to customize the error boundary. If provided, receives an `error` prop of type `RemoteViewError` or `Error`. | A simple div that outputs "Something went wrong" with an accompanying error message. |
