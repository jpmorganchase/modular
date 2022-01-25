---
"modular-scripts": minor
---

Generate dependency manifest (package.json) for apps. This includes all the dependencies, either installed via the package's `package.json` or hoisted to the root's `package.json`.
If a dependency is imported in code but not specified in the `package.json`s, the app will not build anymore.
