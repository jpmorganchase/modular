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
esm.sh.Note that the other packages in that directory are designed for use in
integration tests.
