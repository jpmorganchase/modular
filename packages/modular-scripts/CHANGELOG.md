# modular-scripts

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
