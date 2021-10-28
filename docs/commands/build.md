---
parent: Commands
---

# `modular build <packageName>`

Searches by the name of the package indicated in the `package.json` file in the
workspace and runs
[`react-scripts build`](https://create-react-app.dev/docs/production-build)
against that package.

The output directory for built artifacts is `dist/`, which has a flat structure
of modular package names. Each built app/view/package is added to the `dist/` as
its own folder.

For views and packages, package names are transformed to `Param case` (e.g.
this-is-param-case) in `dist/`

(i.e. `modular build @scoped/package-a` will output built artifacts into
`dist/scoped-package-a`)

## Options:

`--private`: Allows the building of private packages

`--preserve-modules`: Preserve module structure in generated modules
