# modular-scripts

## 0.5.3

### Patch Changes

- 9fca53e: Switched yarn configuration such that the root directory is the
  modular root

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
