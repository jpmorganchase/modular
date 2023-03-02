# RemoteView Fake ESM CDN

This directory gets statically hosted by
`packages/remote-view/src/__tests__/serve.js` in integration tests. The same
script is also used manually to run the `remote-view-demos` package examples.

## Motivation

To test `<RemoteView />` locally, we need ESM views that are (a) built and (b)
hosted and exposed via http. This is expensive and complicated to do on-the-fly,
hence we have a small set of views/dependencies pre-built and exposed.

## Contents

- 4 pre-built ESM views: `esm-view-card`, `esm-view-list` (used in integration
  tests), `view1`, `view2` (used in demos)
- React and ReactDOM at 17.0.2, exposed in the same way it would be by esm.sh
  (v106). This results in various dirs and files.

`view1` and `view2` are built against `esm.sh`, whereas the others are built
against `localhost:8484`.

## Rebuilding the contents

For any ESM view, you need to `yarn modular build` it, which usually requires
pasting the view into the root `packages` dir temporarily. These packages can't
live there permanently, as it inteferes with Modular's own tests.

For ESM CDN content (React, ReactDOM etc), these must be manually downloaded and
exposed into this directory using an identical structure.

Sometimes, it's neccessary to tweak URLs to remove preceding slashes (inside ESM
view index.html files) or add `.js` extensions (for esm.sh manually-downloaded
content).
