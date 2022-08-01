# @modular-scripts/workspace-resolver

This package encapsulates two functions:

1. `resolveWorkspace` - Searches the filesystem (at a given modular root) for
   workspace packages, returning a flat map of all packages found
2. `analyzeWorkspaceDependencies` - Analyzes `package.json` files for a set of
   workspace packages, returning a flat object for each package, listing out
   workspace inter-dependencies plus and mismatched dependencies. The
   dependencies are analyzed according to dependencies defined in `package.json`
   files. The resulting output intends to match the yarn v1 (classic) output for
   `yarn workspaces info` (1)

In most cases, the output of `resolveWorkspace` can be passed directly to
`analyzeWorkspaceDependencies`.

(1) This package exists as a drop-in replacement for `yarn workspaces info`
because the yarn command is not consistent across other versions of yarn.

## Example

```TypeScript
const [workspacePackages] = resolveWorkspace('path/to/modular/project/root')

/*
Map {
    "example-package": {
        path: 'packages/example-package',
        name: 'example-package',
        workspace: false,
        version: '1.0.0',
        modular: {
            type: 'package'
        },
        children: [],
        parent: null,
        dependencies: {
            'lodash': '10.0.0'
        }
    },
    ...
}
*/

const analyzed = analyzeWorkspaceDependencies(workspacePackages);

/*
{
  "example-package": {
    "location": "packages/example-package",
    "workspaceDependencies": ['another-package'],
    "mismatchedWorkspaceDependencies": []
  },
  "another-package": {
    "location": "packages/another-package",
    "workspaceDependencies": [],
    "mismatchedWorkspaceDependencies": ['mismatched-dep-one']
  },
  ...
*/

```
