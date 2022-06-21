---
has_children: true
nav_order: 750
---

Modular builds packages of `"type": "esm-view"` as
[ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules),
rewriting all of a subset of their imports to make use of a configurable ESM CDN
(e.g. [Skypack](https://www.skypack.dev) or [esm.sh](https://esm.sh/)). This
allows users to implement the
[microfrontend pattern](../concepts/microfrontends.md), by creating an artifact
that can be
[`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports)ed
at runtime by a host application, or loaded stand-alone thanks to the automatic
generation of the `index.html` and trampoline file.

- [How to build ESM Views](./how-to-build.md)
- [ESM CDN](./esm-cdn.md)
- [Customize bundling strategy](./customize-bundle-strategy.md)
- [Output package manifest](./output-package-manifest.md)
- [External CSS imports](./external-css-imports.md)
- [Known limitations](./known-limitations.md)
