---
parent: How To
nav_order: 3
title: Create Template
---

# Create a Modular Template

To create a [Modular Template](../concepts/templates.md), start with any Modular
package type for which you want to create a template for (App/Package/etc). The
package's contents will be copied into any new package created using the
template.

To convert the package into a template, make the following changes to the
package's package.json:

- Change `"modular" "type"` field to `"template"`
- Add `"templateType"` field to `"modular"` with the package's Modular type.

Example esm-view template package.json modular field:

```json
{
  "modular": {
    "type": "template",
    "templateType": "esm-view"
  }
}
```

Optionally, include a `"files"` array containing any files that Modular should
include from the template when creating a new package using it. If not
specified, Modular will include all files.
