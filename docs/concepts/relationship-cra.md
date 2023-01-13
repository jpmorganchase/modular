---
title: Relationship with CRA
parent: Concepts
---

[Apps](../package-types/app.md) and [ESM Views](../package-types/esm-view.md)
support pretty much all the functionalities from
[Create React App v5](https://create-react-app.dev), with some important
differences:

## Ejecting

[ejecting](https://create-react-app.dev/docs/available-scripts/#npm-run-eject)
is not supported. As an opinionated tool, Modular tries to offer an uniform way
of building applications, although feedback on our build configuration is
welcome!

## Templates

[template support](../package-types/template.md) is integrated in the
[`modular add`](../commands/add.md) command. Modular templates are not
guaranteed to be compatible with CRA templates.

## Babel plugins

Source files are loaded with the more performant
[`esbuild-loader`](https://github.com/privatenumber/esbuild-loader) in the
Webpack configuration. For this reason, Babel plugins are not supported.

## Proxies

[Local proxies](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
are supported, but [esbuild mode](../configuration.md) doesn't support the
`package.json` `proxy` field. The more flexible
[manual proxy configration](https://create-react-app.dev/docs/proxying-api-requests-in-development/#configuring-the-proxy-manually)
is supported in both Webpack and esbuild mode.

## CSS Modules

[CSS Modules](https://github.com/css-modules/css-modules) are supported exactly
[as in Create React App](https://create-react-app.dev/docs/adding-a-css-modules-stylesheet)
in Webpack mode, but they are not supported in
[esbuild mode](../configuration.md/#usemodularesbuild).
