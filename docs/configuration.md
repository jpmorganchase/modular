---
nav_order: 5
---

# Configuration

Modular has minimal configuration because of it's philosophy. However there is a
set of minimum configuration required.

## `package.json#modular`

_NOTE: This property is created automatically and is described here for
reference only._

_e.g._

```json
{
  "modular": {
    "type": "root"
  }
}
```

The `package.json#modular.type` can be `"root"`, `"app"`, `"view"` or
`"package"`.

### `"root"`

This type identifies the root of the project.

### `"view"`

This type identifies modules that export a single React component as their
default export. `modular` makes these modules available via a dynamically
generated view map with `modular-views.macro`. Read more about Views in
[this explainer](/docs/concepts/views.md).

### `"app"`

This type identifies a standalone application that can be started or built.

### `"package"`

This type identifies a regular package (e.g. a library that can be used by other
`"view"` or `"app"` modules).
