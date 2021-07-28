---
'modular-scripts': patch
---

Uses the param case version of the targeted app of `modular port` and
`modular convert` to create the folder in `packages` directory. Ensures
uniformity between all commands when creating new workspaces in the repo.

`modular port` will check to confirm that there is a `package.json` file in the
targeted react-app directory before proceeding with the port. The package.json
holds key information, such as `name`, `dependencies`, `devDependencies`, and
`browserslist`, that modular uses to create and resolve the new app workspace.
