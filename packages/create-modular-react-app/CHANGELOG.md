# create-modular-react-app

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
