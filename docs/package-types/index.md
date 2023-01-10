---
title: Package Types
has_children: true
nav_order: 5
---

<head>
    <style>
        .table-wrapper th,td {
            min-width: 0;
        }
    </style>
</head>

# Package types

Modular can build several different kinds of packages. We refer to each package
type as a Modular type, and each has different features. The table below
summarises the compatibility of each Modular type with Modular commands and
details their unique features.

| Type                        | [start](../commands/start.md) | [build](../commands/build.md) | [test](../commands/test.md) | [lint](../commands/lint.md) | Custom index / assets      | Bundled               | Entry-point                    |
| --------------------------- | ----------------------------- | ----------------------------- | --------------------------- | --------------------------- | -------------------------- | --------------------- | ------------------------------ |
| [`app`](./app.md)           | ✅                            | ✅                            | ✅                          | ✅                          | ✅                         | ✅                    | `src/index.tsx`                |
| [`esm-view`](./esm-view.md) | ✅                            | ✅                            | ✅                          | ✅                          | ❌                         | ✅†                   | `src/index.tsx`                |
| [`package`](./package.md)   | ❌                            | ✅                            | ✅                          | ✅                          | **N/A**                    | ❌                    | `main` field of `package.json` |
| [`view`](./view.md)         | ✅                            | ✅                            | ✅                          | ✅                          | ❌                         | ❌                    | `main` field of `package.json` |
| [`source`](./source.md)     | ❌                            | ❌                            | ✅                          | ✅                          | **N/A**                    | **N/A** - never built | **N/A** - never built          |
| [`template`](./template.md) | ❌                            | ❌                            | ✅                          | ✅                          | Depends on the target type | **N/A** - never built | **N/A** - never built          |

† For ESM Views, external dependencies are rewritten to point to a CDN
