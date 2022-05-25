---
parent: Commands
title: modular analyze
---

# `modular analyze <package-name>`

Analyzes the dependencies of a package from its source code, emitting JSON to
`stdout` (please note that errors and warnings can still be emitted to
`stderr`).

## Output

The output of the command is a JSON object, with a `resolution` and a `manifest`
field, containing the respectively computed dependency versions for the
specified package. For example:

```json
{
  "manifest": {
    "react": "^17.0.2",
    "@mantine/core": "^3.6.13",
    "lodash": "^4.17.21",
    "lodash.merge": "^4.6.2",
    "ress": "^5.0.2"
  },
  "resolutions": {
    "react": "17.0.2",
    "@mantine/core": "3.6.14",
    "lodash": "4.17.21",
    "lodash.merge": "4.6.2",
    "ress": "5.0.2"
  }
}
```

## How versions are calculated

The source code of the specified package is statically analyzed to find all the
`import` or `require` statements. Then, for each external dependency imported in
the code, a its `manifest` version is computed by looking at the workspace's
manifest files, and its `resolution` version is computed by parsing the
workspace's `yarn.lock`.

For this reason, `resolution` versions are strictly exact, while `manifest`
versions can contain any admissible type of
[ranged semver](https://github.com/npm/node-semver#versions). `manifest`
versions are set to the first successful lookup from the following sequence of
lookup locations:

1. The package's `package.json` `dependencies` field
2. The package's `package.json` `devDependencies` field
3. The root `package.json` `dependencies` field
4. The root `package.json` `devDependencies` field
