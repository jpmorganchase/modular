---
parent: Package Types
nav_order: 20
title: esm-view
---

# ESM View

Modular `esm-view`s are built with the same Webpack or esbuild configuration and
support the same functionalities as the [`app`](./app.md) type, with the
following essential differences:

1. They are compiled as
   [ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

1. All their external `import`s are rewritten to point to an
   [ESM CDN](../esm-views/esm-cdn.md).

1. They don't allow the user to specify a custom `index.html`

1. They don't include a `public` folder in the build

1. They expect their entry-point (`src/index.tsx`) to not render to the DOM, but
   to export something, typically a React Component.

The `esm-view` type is used for creating
[micro-frontends](../concepts/microfrontends.md). They typically expect their
entry-point exports to be
[dynamically `import`ed at runtime](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
by some other micro-frontend, but can be also
[served standalone](../esm-views/how-to-build.md) exactly as an `app`, provided
that they export a React component that can be rendered to the DOM.

Since the micro-frontend pattern allows different teams to build and serve their
applications independently and compose them at runtime (parallelizing otherwise
expensive build operations), third-party dependencies need to be de-duplicated
across micro-frontends; for this reason, external dependencies are not bundled,
but they are rewritten to a [configurable ESM CDN](../esm-views/esm-cdn.md) that
serves them as ES modules on the fly.

## Supported features

ESM views support a subset of [Create React App](https://create-react-app.dev/)
features that make sense in a monorepo context for a type of application that
can be loaded at runtime. See [this page](../concepts/supported-cra.md) for a
detailed list of supported features.

## Build

To [build](../commands/build.md) your ESM View for deployment, run:

```bash
modular build my-esm-view-name
```

The resulting output is an optimized site that can be served statically or
imported at run-time using
[dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import).
All code (files in `src` plus external dependencies required in the code) is
bundled in a single blob of code that can be split in different files, except
for external dependencies that are re-written to an ESM CDN (this behaviour is
[configurable](../configuration.md)).

### Dynamically loading vs statically serving ESM Views

The resulting output of an ESM View contains a synthetically-generated
`index.html` file and a `_trampoline.js` loader, which allows an ESM View to be
served like a static website. The JS and CSS bundle are hashed and linked in the
[generated package.json](../esm-views/output-package-manifest.md), that the
loading code can fetch and examine before importing the `esm-view` at runtime.
For example, this is the stucture of a built ESM View on the filesystem:

```
<modular-root>/dist/my-esm-view
├── asset-manifest.json
├── index.html
├── package.json
└── static
   ├── css
   |  ├── main.1915b736.css
   |  └── main.1915b736.css.map
   └── js
      ├── _trampoline.js
      ├── main.bf0399f0.js
      └── main.bf0399f0.js.map
```

where `/index.html` and `/static/js/_trampoline` are generated to statically
serve the ESM View. It is also possible to load the ESM view dynamically, by
discovering the hashed JS (`/static/js/main.bf0399f0.js`) and CSS
(`/static/css/main.1915b736.css`) entrypoints from the generated
`/package.json`:

```
{
  "name": "my-esm-view",
  "version": "1.0.0",
  "modular": {
    "type": "esm-view"
  },
  "dependencies": {
    "react": "^18.2.0"
  },
  "bundledDependencies": [],
  "module": "/static/js/main.bf0399f0.js",
  "style": "/static/css/main.1915b736.css"
}
```

and importing them at run-time (assuming they are served from `baseUrl`):

```js
const { default: LoadedView } = await import(
  /* webpackIgnore: true */ `${baseUrl}/static/js/main.bf0399f0.js`
);
// Render LoadedView with React
```

```js
const node = document.head;
const url = `${baseUrl}/static/css/main.1915b736.css`;
// Make sure that the CSS is not already loaded
if (!node.querySelector(`link[href="${url}"]`)) {
  node.insertAdjacentHTML(
    'beforeend',
    `<link rel='stylesheet' href='${url}' />`,
  );
}
```

## Start

To run your ESM View locally on a development server, run
[start](../commands/start.md):

```bash
modular start my-esm-view-name
```

This starts a developer server on port 3000, serving the ESM View with an
additional runtime layer that provides a trampoline module to load the generated
files, plus developer experience functionalities like hot reloading and
on-screen error overlay. Please make sure that your ESM View entry-point exports
a React component as default for this to work.

## Entry-point

ESM-Views need an entry-point file located at `src/index.tsx`, which typically
exports a React component as default for the synthetically generated
`index.html` and the `start` command to work.

## Template

ESM Views are generated by `modular add` using the
[`modular-template-esm-view`](https://github.com/jpmorganchase/modular/tree/main/packages/modular-template-esm-view)
[template](./template.md).

## ESM View Reference

For an in-depth reference of how ESM Views work and can be customized, see this
[section](../esm-views).

## Usage with `<RemoteView />`

The [`<RemoteView />` component](../components/remote-view.md) is designed for
consuming ESM Views in a portal-like application. It aims to make implementing
the micro-frontend pattern easier. View the
[`<RemoteView />` docs](../components/remote-view.md) for more information.
