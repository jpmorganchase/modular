---
title: Supported CRA features
parent: Concepts
nav_order: 10
---

# Supported CRA Features

Modular [apps](../package-types/app.md) and
[ESM Views](../package-types/esm-view.md) are compatible with a subset of
features from [Create React App](https://create-react-app.dev):

## Templates

[Template support](../package-types/template.md) is integrated in the
[`modular add`](../commands/add.md) command. Although Modular templates work in
a similar way to Create React App templates, they implement templating in a
different context (different types of packages that live in the same repository)
and they are not compatible with CRA templates.

## Proxies

[Local development proxies](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
are supported, but [esbuild mode](../configuration.md#usemodularesbuild) doesn't
support the `package.json` `proxy` field. The more flexible
[manual proxy configration](https://create-react-app.dev/docs/proxying-api-requests-in-development/#configuring-the-proxy-manually)
is supported in both Webpack and esbuild mode.

## Importing CSS / CSS Modules

Importing CSS stylesheets in Modular apps and ESM Views works in the same way as
[in Create React App](https://create-react-app.dev/docs/adding-a-stylesheet).

[CSS Modules](https://github.com/css-modules/css-modules)
[are also supported](https://create-react-app.dev/docs/adding-a-css-modules-stylesheet),
but only in Webpack mode - imported classes are always `undefined` in
[esbuild mode](../configuration.md/#usemodularesbuild).

All stylesheets are
[autoprefixed](https://create-react-app.dev/docs/post-processing-css) by
default.

## Importing assets

Importing assets in source files is supported exactly as
[in Create React App](https://create-react-app.dev/docs/adding-a-stylesheet).
[Assets in the public folder](https://create-react-app.dev/docs/using-the-public-folder)
are supported in Modular applications, but not in Modular ESM Views.

## Environment variables

Injection of `NODE_ENV` and environment variables starting with `REACT_APP` at
build-time, support for `.env` files, and injection of environment variables in
the `index.html` file (only for Modular Apps) work exactly as
[in Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables).
