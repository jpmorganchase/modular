---
parent: ESM Views
nav_order: 2
title: ESM CDN
---

# Why ESM Views need an external CDN

ESM Views are designed to exclude external dependencies from the output bundle
and `import` them at runtime. This simplifies the build process by removing the
need for explicit dependency de-duplication as the browser will do so
automatically though its cache so long as all dependencies are served from the
same origin, i.e. a single CDN.

This is particularly useful for a host application that lazily loads several
independently developed and hosted applications onto a browser tab at runtime;
If each of those applications naively bundled all their dependencies this would
result in inefficiencies as a copy of each dependency that is used by more than
one application would be included in each bundle. For stateful dependencies like
React that don't allow multiple instances of themselves in the same page
context, this would cause crashes. Importing these external dependencies from a
CDN, instead, means that every shared dependency is loaded from the server
exactly once at runtime and re-used in every point of the code where it's
imported. This improves efficiency and, since every dependency is loaded and
evaluated only once, it plays well with stateful libraries.

# Customise the ESM CDN

You can specify a CDN template to rewrite dependencies using the environment
variable `EXTERNAL_CDN_TEMPLATE`.

For example:

- The default template for the [Skypack](https://www.skypack.dev/) public CDN is
  `EXTERNAL_CDN_TEMPLATE="https://cdn.skypack.dev/[name]@[resolution]"`
- A valid template to work with the esm.sh public CDN can be specified with
  `EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[version]"`
- A valid template to work with the esm.sh public CDN, telling the CDN to build
  dependencies with selective version resolutions can be specified with
  `EXTERNAL_CDN_TEMPLATE="https://esm.sh/[name]@[version]?deps=[selectiveCDNResolutions]"`

These are the substrings that are replaced in the template:

- `[name]` is replaced with the name of the imported dependency
- `[version]` is replaced with the version of the imported dependency as
  extracted from the package's or the root's (hoisted) `package.json`.
- `[resolution]` is replaced with the version of the imported dependency as
  extracted from the yarn lockfile (`yarn.lock`).
- `[selectiveCDNResolutions]` is replaced with the
  [selective version resolutions](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/)
  specified in the manifest, as a comma-separated list of `package@version`
  resolutions. Some CDNs implement a mechanism of building all the requested
  dependencies on the fly, giving the user the option to specify how their
  requested dependencies' subdependencies must be resolved. For example, esm.sh
  has an option to specify a list of fixed dependencies, called
  ["external dependencies"](https://github.com/esm-dev/esm.sh#specify-external-dependencies).
  This is similar to the concept of forcing selective resolutions throughout the
  dependency tree in Yarn; `[selectiveCDNResolutions]` is a mechanism to
  automatically generate a comma-separated list of selective resolutions to pass
  to the CDN from the `resolutions` field in the manifest. _Please note that
  selective version resolutions are not filtered out in any way._ If your
  `resolutions` have special characters like wildcards, and those are not
  supported by your CDN, you can still specify your query options manually.
