---
parent: Concepts
---

## ESM micro frontends in Modular

Micro frontends are a pattern in which discrete UIs (frontends) are composed of
independent fragments that can be built and deployed separately by different
teams and loaded on-demand at runtime. Modular gives developers the opportunity
to implement micro frontends through [ESM Views](../building-apps/esm-views.md),
which are applications built as ES Modules. ESM Views can be served standalone
or dynamically imported by a host application at runtime and rendered in the
host application's own React tree, without the need of using Iframes. ESM Views
also allow automatic dependency de-duplication, thanks to how we offload
third-party dependencies to a configurable ESM CDN.

## How we build micro frontends

A package of `type: "esm-view"` is built as an ES Module by the `modular build`
command. The view's local dependencies are bundled in the dist result, while the
view's external dependencies are rewritten to import from an ESM CDN by default,
like (for example) [Skypack](https://www.skypack.dev/) or
[esm.sh](https://esm.sh/). This allows the view's external dependencies to be
loaded on-demand at runtime and to be automatically de-duplicated (i.e. the same
dependency will be not re-fetched and re-evaluated, but simply re-used if any
view tries to use it the second time) and it's especially useful in a React
micro frontend scenario, where multiple ESM views share the same copy of React,
without incurring in errors associated with
[multiple copies of React in the same page](https://reactjs.org/warnings/invalid-hook-call-warning.html).

Since dynamic import of ESM Modules leverages a
[widely supported standard](https://caniuse.com/es6-module-dynamic-import),
where the browser does the heavy lifting of fetching, de-duplicating and making
dependencies available, ESM Modules are modular's choice building blocks to
implement a micro frontend architecture.

## How to load micro frontends

ESM views, when built, generate a single javascript entrypoint and a single CSS
entrypoint that can be imported ar runtime by any application (or other view)
using dynamic import (or any viable technique in case of styles). ESM views will
generate a package manifest (`package.json` file) which contains information
regarding the location of the built files (whose names are uniquely hashed to
facilitate caching) and lists of bundled and rewritten dependencies along with
their dependencies, in order to decouple importing of ESM views from the actual
build result structure. For more information, visit the
[ESM Views reference page](../building-apps/esm-views.md)

## Standalone support

As ESM views typically export a React component by default, a synthetic
`index.html` capable of loading the view as a standalone web page is provided in
the `dist/{{view-name}}` directory. This means that ESM views can additionally
be served (for example with the `modular serve` command, or any HTTP server) as
normal applications, while retaining the ability of loading their dependencies
via an ESM CDN.

## Customisation

ESM views can be customised by controlling the template used to rewrite the
external imports and by deciding which dependency imports are rewritten to point
to a CDN and which are bundled. For more information on how to customise the
build of ESM views, visit the
[ESM Views reference page](../building-apps/esm-views.md)
