---
parent: Commands
---

# `modular init`

Initializes a modular root type package.json in the current directory with
packages folder set up to add modular packages to.

## Options:

`-y`: Equivalent to setting it for `npm init`. Generates an empty npm project
without all of the interactive processes.

`--prefer-offline`: Uses offline yarn cache when possible

`--verbose`: Run yarn commands with --verbose set and sets
`MODULAR_LOGGER_DEBUG` to true
