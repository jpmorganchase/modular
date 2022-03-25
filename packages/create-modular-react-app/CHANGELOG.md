# create-modular-react-app

## 2.1.3

### Patch Changes

- [#1447](https://github.com/jpmorganchase/modular/pull/1447)
  [`a7e0b07`](https://github.com/jpmorganchase/modular/commit/a7e0b0749ad82783511cb92c77171995796465a4)
  Thanks [@cangarugula](https://github.com/cangarugula)! - Removed initial git
  commit of create-modular-react-app and upgraded node versions in
  modular-scripts

## 2.1.2

### Patch Changes

- [#1166](https://github.com/jpmorganchase/modular/pull/1166)
  [`2821fa2`](https://github.com/jpmorganchase/modular/commit/2821fa257d9c393ef6dd003ec14565d2f2ce075e)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Restrict
  typescript range for better compatibility with typescript-eslint

## 2.1.1

### Patch Changes

- [#1060](https://github.com/jpmorganchase/modular/pull/1060)
  [`e525436`](https://github.com/jpmorganchase/modular/commit/e525436f7d451f5bc645997ad6a380acf32f9fac)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - - Root
  yarn start/build aliases modular start/build in a CMRA repo
  - If no argument given to `yarn / modular start`, provide the user with an
    interactive selection

* [#1033](https://github.com/jpmorganchase/modular/pull/1033)
  [`d9f42fe`](https://github.com/jpmorganchase/modular/commit/d9f42fea338b0bf70968e4690bf2b5aa2ba108ff)
  Thanks [@steveukx](https://github.com/steveukx)! - Add extraneous dependencies
  and add lint rule to ensure dependencies always added

## 2.1.0

### Minor Changes

- [#1025](https://github.com/jpmorganchase/modular/pull/1025)
  [`f30f7f4`](https://github.com/jpmorganchase/modular/commit/f30f7f49b0d25859e211e725aa66e2177753f00f)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Suppress
  Yarn warnings by default when the `verbose` flag is not specified. This
  changes the screen output of `create-modular-react-app` and `modular add`.

## 2.0.0

### Major Changes

- [#908](https://github.com/jpmorganchase/modular/pull/908)
  [`226ad45`](https://github.com/jpmorganchase/modular/commit/226ad45251ab1955bd955fac97407e263af9de76)
  Thanks [@LukeSheard](https://github.com/LukeSheard)! - Add exports fields to
  all packages.

### Minor Changes

- [#991](https://github.com/jpmorganchase/modular/pull/991)
  [`82ff280`](https://github.com/jpmorganchase/modular/commit/82ff2806a7aeb426654793ce6b5fd98384e2ccd4)
  Thanks [@LukeSheard](https://github.com/LukeSheard)! - Add --empty flag and
  improve error handling.

## 1.1.3

### Patch Changes

- e55b4f9: Browserlist cross-compatibility between webpack and esbuild.

## 1.1.2

### Patch Changes

- 0037835: Bump commander from 8.1.0 to 8.2.0

## 1.1.1

### Patch Changes

- e85a2d3: Bump chalk from 4.1.1 to 4.1.2

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
