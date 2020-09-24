# create-modular-react-app

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
