# create-modular-react-app

## 1.1.0

### Minor Changes

- ab7b04d: Add `--verbose` to create-modular-react-app and improve error
  handling for sub-processes

### Patch Changes

- 805edb0: Bump commander from 8.0.0 to 8.1.0
- b00cddc: Bump @types/semver from 7.3.7 to 7.3.8

## 1.0.0

### Major Changes

- af8f49f: Remove react-scripts as a dependency and release major change.
- 6fc027c: Add engine startup check to CLIs to ensure that the version of node
  running is supported

### Patch Changes

- c9b6a66: Bump @types/fs-extra from 9.0.11 to 9.0.12
- 2f57d60: Bump @types/semver from 7.3.6 to 7.3.7
- 11aa1c1: Bump @types/tmp from 0.2.0 to 0.2.1

## 0.8.11

### Patch Changes

- 12ec27f: Add required engines for packages
- 5fe389f: Bump commander from 7.2.0 to 8.0.0

## 0.8.10

### Patch Changes

- 704cec9: Fix typo in package.json

## 0.8.9

### Patch Changes

- 1843843: Fix issue with creating a new modular app with a name
- 10e1738: Updated vscode template settings in CMRA and moved utils around

## 0.8.8

### Patch Changes

- ab4aa76: Bump execa from 5.0.1 to 5.1.0
- 9585460: Bump execa from 5.1.0 to 5.1.1

## 0.8.7

### Patch Changes

- cff1dd2: Removed unneccessary silent flag
- 18aea9d: Bump execa from 5.0.0 to 5.0.1

## 0.8.6

### Patch Changes

- 52e4c3d: Better \*ignore files in new projects.
- 308847e: Bumping versions for actually landing/releasing

## 0.8.5

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.8.5-next.0

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.8.4

### Patch Changes

- f035528: Allow arbitrary directory structures for packages

## 0.8.4-next.0

### Patch Changes

- f035528: Allow arbitrary directory structures for packages

## 0.8.3

### Patch Changes

- 84ef2db: Enhance eslint-config-modular-app, add .prettierignore and
  .eslintignore files in templates

## 0.8.2

### Patch Changes

- d8aee46: Use yarn --silent where possible
- 6a249ea: Avoid some console spam by installing dependencies correctly.

## 0.8.1

### Patch Changes

- beb619c: Adds a debug test launch config for vscode

## 0.8.0

### Minor Changes

- 4466eb6: Use a common tsconfig that we can update whenever

### Patch Changes

- 6e49be1: Ignore new build folders in local workspaces

## 0.7.2

### Patch Changes

- 8fcd4ee: recommended extensions for vscode, and an .editorconfig (#199)

## 0.7.1

### Patch Changes

- c9c11df: Update node engine requirements to >=12
- e65e681: Enable in-browser lint experience, fix type requirements.

## 0.7.0

### Minor Changes

- 04623e9: Fix dependencies in eslint-config-modular-app, initialise new
  projects with typescript

## 0.6.0

### Minor Changes

- ef680c2: Bypass create-react-app when creating a new application. Accept
  --prefer-offline for fast installs.

## 0.5.0

### Minor Changes

- 4174608: Install react/react-dom at the root of the generated repository. Fix
  placeholder replacement for generated packages. Pass options to test runner
  correctly.

## 0.4.1

### Patch Changes

- 4d8d69b: Fix the broken release, and update snapshot tests.

## 0.4.0

### Minor Changes

- 1b34e70: refactor the repository to become a modular project itself.

### Patch Changes

- e2df965: Remove `package-lock.json` file created by adding a new app.

  Initialise a Git repository before `create-react-app` does.

- f51a10a: Do not create a shared package by default in new projects

## 0.3.0

### Minor Changes

- ca44022: Place `setupTests` into the root of a modular project:
  `modular/setupTests.ts`

## 0.2.2

### Patch Changes

- 3616010: Do not print `execa` stack traces when processes error.

  Ensure that the `build/` directory does not get added into a Git repository.

  Let the underlying commands handle any `--help` argument instead of
  `modular`'s own argument parser.

## 0.2.1

### Patch Changes

- f494252: removes code duplication for creating an app.

## 0.2.0

### Minor Changes

- 18cec6d: Initialise a new project without making it a repository by passing
  `--no-repo` flag

## 0.1.1

### Patch Changes

- This release fixes the missing build folders.

## 0.1.0

### Minor Changes

- This release adds support for multiple apps, and a simpler folder layout.
