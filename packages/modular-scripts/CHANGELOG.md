# modular-scripts

## 0.12.3

### Patch Changes

- 384e19e: Bump esbuild from 0.12.4 to 0.12.5
- 20c66ed: Bump rollup from 2.50.1 to 2.50.2
- 1f85f22: Bump esbuild from 0.12.3 to 0.12.4
- b20a09c: Bump @babel/preset-env from 7.14.2 to 7.14.4
- 1771a1a: Clean exit of start and build processes
- c787596: Add jest defaults back to config
- 73b4b12: Bump typescript from 4.2.4 to 4.3.2
- 18aea9d: Bump execa from 5.0.0 to 5.0.1

## 0.12.2

### Patch Changes

- e32b47e: Add types and full built files to npm

## 0.12.1

### Patch Changes

- a663161: Update modular scripts bin

## 0.12.0

### Minor Changes

- 0e949cd: Add filelock around package builds to ensure that multiple process
  builds don't conflict
- 6feeaf4: Replaced esbuild-jest and added check for monaco plugin
- 257862c: Allow overriding for certain jest options found in package.json or
  jest.config.js
- 21e9449: Expose workspace info via CLI command
- 94cdea4: Migrate CLI interface to commander to enable command introspection
  via declarative options API

### Patch Changes

- c30d576: Clean up build folder
- f95179f: Bump esbuild from 0.12.1 to 0.12.2
- 74a6323: Bump esbuild from 0.12.2 to 0.12.3
- 68eae74: Target esmodules for transpilation of packages
- 79a385d: Bump pptr-testing-library from 0.6.4 to 0.6.5
- 6061996: Bump rollup from 2.49.0 to 2.50.0
- 6e1fa8c: Set babel-jest presets to babel-preset-react-app
- 9568838: Prevent yarn workspace errors when starting modular via the CLI.

## 0.11.0

### Minor Changes

- 972af73: Replace transpilation implementation with esbuild instead of babel.

### Patch Changes

- e12fedd: Update react-scripts to 4.0.3

## 0.10.0

### Minor Changes

- 9023f11: Expose node.js API for modular-scripts
- aa95360: Enable bin development for packages

### Patch Changes

- 4080e8f: Dependabot: Bump rollup from 2.38.3 to 2.45.2
- 9f9a332: Update create-react-app from 4.0.1 to 4.0.2
- 74ab5d2: Suggest installing @finos/perspective-webpack-plugin if
  @finos/perspective is available.
- 1166d26: Corrected issue with Babel plugins that was making
  @babel/preset-typescript not to apply correctly

## 0.9.10

### Patch Changes

- 84c7b2a: Don't convert all css files to css modules

## 0.9.9

### Patch Changes

- 1e94448: Install fewer dependencies
- 308847e: Bumping versions for actually landing/releasing

## 0.9.8

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.9.8-next.0

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.9.7

### Patch Changes

- f035528: Allow arbitrary directory structures for packages

## 0.9.7-next.0

### Patch Changes

- f035528: Allow arbitrary directory structures for packages

## 0.9.6

### Patch Changes

- 84f2a3b: Don't install puppeteer as a dependency
- bb278f7: Update rollup to 2.38.3

## 0.9.5

### Patch Changes

- 84ef2db: Enhance eslint-config-modular-app, add .prettierignore and
  .eslintignore files in templates

## 0.9.4

### Patch Changes

- a2df764: Don't install the perspective plugin (but still use it if it's
  available)

## 0.9.3

### Patch Changes

- d8aee46: Use yarn --silent where possible

## 0.9.2

### Patch Changes

- 7c14fdb: Fix the macro's type generation, and avoid some console spam when
  installing.

## 0.9.1

### Patch Changes

- a79b8da: Bring back support for --inspect-brk, for testing with a debugger.
- f193cfd: Bail `modular build` for libraries when there is a setup issue.

## 0.9.0

### Minor Changes

- 8de0a31: Include @finos/perspective-webpack-plugin by default.

## 0.8.1

### Patch Changes

- 4cb46cc: Add tsconfig for publishing

## 0.8.0

### Minor Changes

- 4466eb6: Use a common tsconfig that we can update whenever

### Patch Changes

- 72637d7: Do sequential builds instead of parallel\
- c5c15eb: Fix an issue where generated files from libraries would interfere
  with typescript definition generation

## 0.7.0

### Minor Changes

- 6c5e925: When building libs, don't throw an error on submodule import for
  non-js files

## 0.6.3

### Patch Changes

- 74780c4: Fix broken build from #207

## 0.6.2

### Patch Changes

- 11912bb: Use update-notifier to point out upgrades when possible (in #203)
- 4e285e6: minor enhancements/fixes to `modular build <package>`

## 0.6.1

### Patch Changes

- 99ee3b9: Update craco to v6

## 0.6.0

### Minor Changes

- 33649d2: modular build `<library>`

### Patch Changes

- af3e1c6: Put a scary warning in the craco config file name

## 0.5.3

### Patch Changes

- 5e0b42e: Fix issue where verifyPackages would be called on all jest workers
  and exit without logging
- cb2208a: Expose ability to add setupFiles to jest when running tests

## 0.5.2

### Patch Changes

- c9c11df: Update node engine requirements to >=12
- e65e681: Enable in-browser lint experience, fix type requirements.

## 0.5.1

### Patch Changes

- 674e1cb: Fix /src not being generated on new apps

## 0.5.0

### Minor Changes

- ef680c2: Bypass create-react-app when creating a new application. Accept
  --prefer-offline for fast installs.

## 0.4.0

### Minor Changes

- 4174608: Install react/react-dom at the root of the generated repository. Fix
  placeholder replacement for generated packages. Pass options to test runner
  correctly.

### Patch Changes

- fa01449: Remove "Huh?" from question when making a new package.

## 0.3.5

### Patch Changes

- 6bf06ed: Run jest manually, instead of using react-scripts to do so.

## 0.3.4

### Patch Changes

- e2cbc71: Update to CRA 4.0.1, and use prompts instead of inquirer in
  modular-scripts.

## 0.3.3

### Patch Changes

- 96f095f: Replaced globby with glob, fixed windows issues

## 0.3.2

### Patch Changes

- 2dc901e: Generate views and packages correctly so that tests can run properly.

## 0.3.1

### Patch Changes

- 4d8d69b: Fix the broken release, and update snapshot tests.

## 0.3.0

### Minor Changes

- 1b34e70: Update craco and create-react-app
- 952f314: Rename widgets to views.
- 1b34e70: refactor the repository to become a modular project itself.

### Patch Changes

- e2df965: Remove `package-lock.json` file created by adding a new app.

  Initialise a Git repository before `create-react-app` does.

## 0.2.0

### Minor Changes

- ca44022: Place `setupTests` into the root of a modular project:
  `modular/setupTests.ts`

## 0.1.4

### Patch Changes

- 3616010: Do not print `execa` stack traces when processes error.

  Ensure that the `build/` directory does not get added into a Git repository.

  Let the underlying commands handle any `--help` argument instead of
  `modular`'s own argument parser.

## 0.1.3

### Patch Changes

- 50537c1: Fix test coverage so that it's produced for all apps, packages and
  widgets.

  Alter test configuration
  [so that it loads the `src/setupTests.{js,ts}` for each application](https://github.com/jpmorganchase/modular/pull/100#discussion_r490495909).

## 0.1.2

### Patch Changes

- f494252: removes code duplication for creating an app.

## 0.1.1

### Patch Changes

- This release fixes the missing build folders.

## 0.1.0

### Minor Changes

- This release adds support for multiple apps, and a simpler folder layout.
