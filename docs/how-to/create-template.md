---
parent: How To
nav_order: 3
title: Create Template
---

# Create a Modular Template

To create a [Modular Template](../package-types/template.md), start with any
Modular package type for which you want to create a template for (`app`,
`package`, etc). The package's contents will be copied into any new package
created using the template.

To convert the package into a template, make the following changes to the
package's package.json:

- Change `modular.type` field to `"template"`
- Add `modular.templateType` with the desired target package type

Example configuration for a template that generates `esm-view`s.

```json
{
  "modular": {
    "type": "template",
    "templateType": "esm-view"
  }
}
```

Optionally, include a `files` array pattern containing any files that Modular
should include from the template when creating a new package using it. Example:

```json
{
  "files": [
    "path/to/file-to-include-1.tsx",
    "path/to/file-to-include-2.ts",
    "folder-to-include"
  ]
}
```

If not specified, Modular will include all files.
