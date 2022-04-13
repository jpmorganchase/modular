---
parent: Concepts
---

## ESM micro frontends

Micro frontends are a pattern where discrete UIs (frontends) are composed from
independent fragments that can be built and deployed separately by different
teams. Modular gives developers the opportunity of implementing microfrontends
through [Views](../building-apps/esm-views.md), which are applications built as
ES Modules, that can be served standalone or dynamically imported by an host
application. This is particularly useful when a View exports a default React
component: an host application can import it at runtime and render it in its own
React tree, without the need of using IFrames and with automatical dependency
de-duplication, thanks to the use of an external ESM CDN.

## How to build micro frontends

Modular Views build by default as ESM libraries, whose local dependencies are
bundled and whose external dependencies are rewritten to import from an online
ESM CDN, like [Skypack](https://www.skypack.dev/) or [esm.sh](https://esm.sh/).
