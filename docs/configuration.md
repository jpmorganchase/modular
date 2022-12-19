---
nav_order: 10
---

# Configuration

Because of its philosophy, Modular has a restricted set of configurable
behaviours. Additionally it requires some minimal configuration within the
`package.json`s in the repository, all handled by Modular itself.

## Configuration File

We allow a number of Modular behaviours to be configured via a dedicated Modular
config file, `.modular.js`, located at the root of the repository.

We support the following file names/formats:

- `modular` property within your `package.json`
- `.modular.js`
- `.modularrc`
- `.modularrc.json`
- `.modularrc.yaml`
- `.modularrc.yml`
- `.modularrc.js`
- `.modularrc.cjs`
- `modular.config.js`
- `modular.config.cjs`

Example `.modular.js` file contents with all configurable attributes and their
default values:

```js
module.exports = {
  useModularEsbuild: false,
  externalCdnTemplate: 'https://esm.sh/[name]@[version]',
  externalBlockList: [],
  externalAllowList: ['**'],
  publicUrl: '',
  generateSourceMap: true,
};
```

### **useModularEsbuild**

**Type**: `boolean`

**Default**: `false` - Uses [Webpack](https://webpack.js.org/)

Use esbuild instead of default Webpack. Only affects Views and ESM Views.

### **externalCdnTemplate**

**Type**: `string`

**Default**: `https://esm.sh/[name]@[version]` - [esm.sh](https://esm.sh/)

Template to resolve the URL used to fetch packages from a CDN. Defaults to
esm.sh. Only applies to ESM Views.

### **externalBlockList**

**Type**: `string[]`

**Default**: `[]` - No packages

Packages that should be bundled and not fetched from a CDN. We recommend
allowing all packages to be handled by the CDN, except for particular cases
where they would not work correctly. See
[known-limitations](./esm-views/known-limitations.md). Defaults to none. Only
applies to ESM Views.

### **externalAllowList**

**Type**: `string[]`

**Default**: `[**]` - All packages

Packages that should be fetched from a CDN. We recommend allowing all packages
to be handled by the CDN, except for particular cases where they would not work
correctly. See [known-limitations](./esm-views/known-limitations.md). Defaults
to all packages. Only applies to ESM Views.

### **publicUrl**

**Type**: `string`

**Default**: `''` - No Public URL

Same as Create React App PUBLIC_URL. Instead of assuming the application is
hosted in the web server's root or subpath specified by homepage in
package.json, assets will be referenced to the URL provided.

### **generateSourceMap**

**Type**: `boolean`

**Default**: `true`

Should build process generate a source map - can be disabled for performance
reasons. Source maps are resource heavy and can cause out of memory issue for
large source files.

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

### `"esm-view"`

This type identifies an ESM view that can be started in standalone mode, built
and imported dynamically by an host application.

### `"package"`

This type identifies a regular package (e.g. a library that can be used by other
`"view"` or `"app"` modules).
