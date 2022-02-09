---
parent: Commands
title: modular port
---

# `modular port <relativePath>`

Takes a relative path from the modular root directory to the targeted
create-react-app project and ports it over to the current modular project as a
modular app.

```
$ modular port ../another-react-app
```

This action is `atomic` so if an error occurs while porting, it will stash any
changes made and bring the repo back to the previous state prior to the attempt.

- Creates a new folder in packages workspace, named using your targeted app's
  package.json name

- Moves the `src` and `public` folders into the new workspace

- If present, updates the `react-app-env.d.ts` file within the new workspace to
  reference modular-scripts for types of static assets (e.g. svgs)

- Creates a tsconfig.json within the new workspace to extend the root
  `tsconfig.json`

- If you do not have a `modular/setupTests` file and the targeted app has a
  `src/setupTests` file, it will move it into the `modular` folder to load
  before executing `modular test`

- Resolves dependencies between the two repos.

## Dependency Resolution

`modular port` does not set up `nohoist` in `package.json` for mismatched
versions.

If the targeted app has a `dependency` that is versioned differently than the
modular root dependency, the package@version in modular root will take
precedence.

If the targeted app has a `devDependency` that is marked as a `dependency` in
modular root, it will not be ported over into the modular app as a
`devDependency` but instead be kept as a dependency in modular root. During this
resolution, if modular root has the package in its dependencies, the version in
modular root will take precedence.

Given the case that the app you are porting over has a dependency that is a
local package in modular worktree, if the target app's dep has a different
version than the local version, that package would not be symlinked to the local
package at all if brought over directly. It would get its own copy in its
node_modules.
(https://github.com/yarnpkg/yarn/issues/6898#issuecomment-478188695)

Example: TargetApp's dependency: foo@^1.0.5

Modular package foo's local version: 2.0.1

TargetApp will have copy of foo@1.0.5 in its workspace node_modules.

It will be marked as a `mismatchedWorkspaceDependencies` in yarn workspaces. We
do not allow `mismatchedWorkspaceDependencies` in the modular workspace.

If the targeted app has a `dependency` or `devDependency` of a package that is a
local workspace in your modular repo, we will remove that dependency from the
target app and have it use the local symlinked version instead.
