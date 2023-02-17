# Contributing

Refer to the [main Modular contributing guidelines]() for a summary of
contributing to Modular.

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

The relevant (`react` and `react-dom`) ESM dependencies have been pre-downloaded
in `__fixtures__/remote-view/output`. URLs inside the content of these
dependencies have been re-written to point at `localhost:8484`. Also, a `.js`
extension has been added to make serving the files simple (`serve-static` fails
to handle extensionless files as JavaScript because of how the underlying `send`
package works).

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

There is also some modification required to suit the test environment:

- For each, in `index.html`, change `src="/static/js/_trampoline.js"` to remove
  the leading `/`
- In `main.xxxx.js` and `_trampoline.js` for each, ensure that the `.js` file
  extension has been added to any ESM CDN import statements (should be just
  `react` / `react-dom`)

Also, unneccessary files such as `asset-manifest.json` and `*.js.map` have been
removed since they are useless in the context of test.

To test that the two pre-built ESM views are working as expected, you can:

1. Manually serve them: (from root of monorepo):
   `node packages/remote-view/src/__tests__/serve.js`
2. Visit the URLs in a browser:
   `http://localhost:8484/esm-view-card/index.html`,
   `http://localhost:8484/esm-view-list/index.html`
