---
parent: Commands
title: modular start
---

# `modular start [options] <packageName>`

Runs
[`react-scripts start`](https://create-react-app.dev/docs/getting-started#npm-start-or-yarn-start)
against the indicated app or view.

When starting a view, modular expects the the default export of the view's
`index.tsx` file to be a function that returns a component (Don't worry, this is
what modular views are initialized as). Modular will import this view as a
module within a template app, which we stage in a `node_modules/.modular`
folder. You can develop your view as you normally would an app and it will
automatically re-compile as you make changes in the view package.

## HTTPS

That are several options for enabling HTTPS in local development.

Modular follows the
[CRA implementation to enable HTTPS](https://create-react-app.dev/docs/using-https-in-development/#custom-ssl-certificate).

There are two SSL certificate options available:

1. Plain, self-signed (default): use the default self-signed certificate that
   gets generated automatically (requires user to accept an invalid cert)
2. A custom, signed certificate: you want to use a custom certificate (e.g. to
   get a valid certificate chain that will enable authentication flows)

To use custom certificates, provide the `SSL_CRT_FILE` and `SSL_KEY_FILE`
environment variables:

```bash
HTTPS=true SSL_CRT_FILE=cert.crt SSL_KEY_FILE=cert.key yarn modular start
```

Both values can be filenames or paths to files within the project. Modular will
look for your files:

1. In the individual package directory
2. In the monorepo root

## Options:

`--verbose`: Run yarn commands with the --verbose flag set
