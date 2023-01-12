---
parent: Commands
title: modular serve
---

# `modular serve [options] <target>`

Start a local HTTP server to serve an already-[built](./build.md)
[application](../package-types/app.md) or
[ESM View](../package-types/esm-view.md). This is different from
[start](./start.md) in that it statically serves an already-built `app` or
`esm-view` directly from `dist/<target>` without injecting any run-time script.
Use it to preview the result of a build with optimized bundles and minification.

## Options

`--port`: Select the port to serve on (default: '3000')
