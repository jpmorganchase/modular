# RemoteView Demos

This package contains demos of `<RemoteView />`.

The examples are a reference for users, but this package is also useful for
developing `<RemoteView />` components themselves.

## Setup

For demos using `<RemoteView />` to work, we need some `esm-view`s that our
RemoteView will render.

To this end, `view1` and `view2` have been pre-built and are exposed in the fake
ESM cdn that is also used in integration tests
(`__fixtures/remote-view-fake-cdn`). These two views have been built pointing at
esm.sh, which means that this demo only works with connectivity through to
esm.sh. Note that the other packages in that directory are designed for use in
integration tests.

To run the demos, from the root of the monorepo:

1. `node packages/remote-view/src/__tests__/serve.js` (boots a local static
   content server on port 8484, exposing the pre-built views)
2. `yarn modular start remote-view-demos` - launches the demos on
   `localhost:3000`
