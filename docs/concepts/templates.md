---
parent: Concepts
title: Modular Templates
---

# Templates

Templates are a special kind of Modular package, defined by the
`modular: { type: template, "templateType": "..." }` fields in their
`package.json`. They contain a list of files used to populate a new package
initialized by the [`modular add`](../commands/add.md) command. Templates can be
either used implicitly (every modular `type` has a default template) or provided
explicitly to `modular add`, either interactively or via the `--template`
option.

# Examples

```bash
# adds a new package with the name "@app/package-name"
# and type "esm-view" using a template provided by the modular team
# this is the same as selecting type: esm-view
modular add @app/package-name \
    --template modular-template-esm-view
```

```bash
# adds a new package with the name "my-custom"
# uses a custom template published to npm by the community
modular add my-custom \
    --template modular-template-custom-template
```

# Default templates

The `modular add` command automatically uses a default template to create a new
target package, depending on the desired package `type`. These default templates
are maintained by the Modular team in the
[Modular public repository](https://github.com/jpmorganchase/modular) and
published to the NPM registry. This is a list of default templates, linked to
the correspondent type and NPM package:

| Modular type | Template                                                                                                           | NPM Package                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| app          | [modular-template-app](https://github.com/jpmorganchase/modular/tree/main/packages/modular-template-app)           | [Link](https://www.npmjs.com/package/modular-template-app)      |
| esm-view     | [modular-template-esm-view](https://github.com/jpmorganchase/modular/tree/main/packages/modular-template-esm-view) | [Link](https://www.npmjs.com/package/modular-template-esm-view) |
| package      | [modular-template-package](https://github.com/jpmorganchase/modular/tree/main/packages/modular-template-package)   | [Link](https://www.npmjs.com/package/modular-template-package)  |
| view         | [modular-template-view](https://github.com/jpmorganchase/modular/tree/main/packages/modular-template-view)         | [Link](https://www.npmjs.com/package/modular-template-view)     |

# Community templates

Anyone can write a Modular template that can be used in a Modular monorepository
and optionally publish it to the NPM registry for other teams to use. The
`modular add` command, when provided a `--template` option (or the equivalent
selection at the interactive prompt), will search for a package whose name
equals to the provided template option in the current workspace packages. If
such a package is not found, Modular will try to install it with Yarn.

## How to find community templates

By convention, community templates published to the NPM registry have their name
prefixed by `modular-template-`. Existing Modular templates can be found by
searching for
[`modular-template-*`](https://www.npmjs.com/search?q=modular-template-*) on
NPM.

# How to write a template

## Template manifest

A template is a regular Modular package with the `modular.type` manifest field
set to `template` and the `modular.templateType` field set to the target module
`type` that will be set by `modular add`. For example, a template with this
configuration will result in a new package of type `esm-view` when the template
is passed to `modular add`:

```json
{
  "modular": {
    "type": "template",
    "templateType": "esm-view"
  }
}
```

## Template contents and interpolation

All the files contained in the template package (optionally filtered by the
`file` manifest field) will be copied in the target package by `modular add`,
with these exceptions:

- `package.json` will be generated from scratch using the template's
  `modular.templateType` as the target's `modular.type`. Only the target's
  manifest `dependencies` and `main` fields will be overwritten by the
  template's respective manifest fields.
- The strings `PackageName__` and `ComponentName__` present in any of the target
  files will be overwritten, respectively, by the target package name as-is and
  the target package name converted to `PascalCase` (the latter is useful for
  source code template files where, for example, a React component is created).
