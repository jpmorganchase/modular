# modular-scripts

## 1.1.0

### Minor Changes

- 6c14b96: Default `--preserve-modules` to `true` when building packages to
  enable `export` field in `package.json` files.
- 21efc22: Disable typechecking for modular start, test, build commands in CI
  environments
- f049ab9: Modular port takes a relative path to a react app from modular root
  and ports the source code over as a modular app in the current modular
  packages workspace
- 21efc22: Added `modular typecheck` command to programatically type check the
  project
- 6c14b96: Add `--private` argument for building packages marked `private: true`
  in their `package.json`

### Patch Changes

- 5193d4b: Bump @rollup/plugin-commonjs from 19.0.0 to 19.0.1
- 3ed40d4: Bump open from 7.4.2 to 8.2.1
- 4098979: Expose react-scripts internally through modular-scripts. Improve
  performance of app builds by directly building into the output dist directory
- 9ea9c28: Bump gzip-size from 5.1.1 to 6.0.0
- 2af3068: Remove files from **tests** having typings generated for them for
  package builds.
- 6c14b96: Fix bug where typings were generated relative to the package
  directory and not the `src` directory.
- 6e626e2: Bump @babel/code-frame from 7.10.4 to 7.14.5
- cb4ebb7: Bump @babel/preset-env from 7.14.7 to 7.14.8
- 8a1b5fa: Bump filesize from 6.1.0 to 7.0.0
- 152d59d: Add required dependencies and `file` in
  `modular-scripts/package.json`
- 8b75851: Bump rollup from 2.52.8 to 2.53.1
- 0958996: Bump @rollup/plugin-node-resolve from 13.0.0 to 13.0.2
- f560685: Close dev-server when running `start` in CI.
- b03ddb2: Bump browserslist from 4.14.2 to 4.16.6

## 1.0.1

### Patch Changes

- 613678d: Fix `modular check` to support directories which start with the same
  names

## 1.0.0

### Major Changes

- 5d1d40b: Build output is now flat by prettified package name instead of
  relative package location in the worktree.
- 5d1d40b: Package operations are now via name instead of workspace location.
- af8f49f: Remove react-scripts as a dependency and release major change.
- 6fc027c: Add engine startup check to CLIs to ensure that the version of node
  running is supported
- 90a9b45: Add validation of worktree stucture to prevent nested workspaces.

### Minor Changes

- 3e705a3: Modular convert will assume your current directory is an initialized
  modularrepo and move any src and public folders into a modular app to convert
  yourreact app project into a modular project

### Patch Changes

- 9c6b612: Make action imports asyncronous in cli startup
- ba9652a: Fix modular workspace public prop
- cd73064: Bump webpack from 4.44.2 to 4.46.0
- 090030b: Write result of modular workspace to stdout
- 2488c64: Bump case-sensitive-paths-webpack-plugin from 2.3.0 to 2.4.0
- 3fd0120: Bump @types/react-dev-utils from 9.0.6 to 9.0.7
- 5f105e2: Bump @types/jest from 26.0.23 to 26.0.24
- 6e0838f: Bump jest-watch-typeahead from 0.6.1 to 0.6.4
- 4af6880: Bump html-webpack-plugin from 4.5.0 to 4.5.2
- 2f57d60: Bump @types/semver from 7.3.6 to 7.3.7
- d9f6f6f: Fix issue with SVG loading with svgr/webpack loader
- b02f864: Bump webpack-dev-server from 3.11.1 to 3.11.2
- d59c9cf: Bump file-loader from 6.1.1 to 6.2.0
- 2d89a00: Remove babel-loader from modular-scripts dependencies
- a088791: Bump rollup from 2.52.3 to 2.52.4
- 1f515e3: Bump resolve-url-loader from 3.1.4 to 4.0.0
- f9ba0ad: Bump esbuild from 0.12.12 to 0.12.15
- 2d89a00: Remove web-vitals from modular-scripts dependencies

## 0.14.0

### Minor Changes

- 3cb05b7: Ability to start dev server for a modular view

### Patch Changes

- d0b8ada: Switch to "jsx": "react" in tsconfig to maintain compatibility with
  esbuild-loader and React.
- bc5a48b: Bump esbuild from 0.12.10 to 0.12.12
- 72379f0: Bump react-native-web from 0.16.5 to 0.17.1
- 3ab3b71: Fix issues with init and --help flags interactions with preflight
  checks.
- 12ec27f: Add required engines for packages
- 971cdf6: Bump esbuild from 0.12.9 to 0.12.10
- 5fe389f: Bump commander from 7.2.0 to 8.0.0
- cbc1224: Move verifyPackageTree into modular to enable customization

## 0.13.0

### Minor Changes

- 49e5f21: add `init` API which is a replacement of `npm init` for creating a
  new modular folder in the current working directory.

### Patch Changes

- 834ee7e: Bump postcss from 8.3.4 to 8.3.5
- 2727ad3: Bump @babel/preset-env from 7.14.5 to 7.14.7
- fe3cf48: Fix issues with `init` command `package.json` structure so that yarn
  is setup.
- 5c2c16e: Fix issues where modular bin dependencies could not be found when
  running from global CLI
- fe3cf48: Expose init command via CLI
- 10e1738: Updated vscode template settings in CMRA and moved utils around

## 0.12.4

### Patch Changes

- 7854bce: Allow for extraneous test options for jest debuggers
- 6123408: Bump esbuild from 0.12.5 to 0.12.6
- ab4aa76: Bump execa from 5.0.1 to 5.1.0
- 18038e0: Bump esbuild from 0.12.8 to 0.12.9
- 2cef335: Bump @types/prompts from 2.0.12 to 2.0.13
- 9585460: Bump execa from 5.1.0 to 5.1.1
- 7c380ad: Bump react-native-web from 0.16.3 to 0.16.5
- 3b62172: Add post-css dependency
- dda9ca7: Bump postcss from 8.3.2 to 8.3.4
- c4e7dac: Bump @babel/core from 7.14.5 to 7.14.6
- fba4fb5: Bump rollup from 2.51.2 to 2.52.0
- 8062204: Bump postcss from 8.3.1 to 8.3.2
- 3f33953: Bump rollup from 2.51.1 to 2.51.2
- 6afcd66: Bump esbuild from 0.12.7 to 0.12.8
- a72049c: Bump esbuild from 0.12.6 to 0.12.7
- 24fba84: Bump rollup from 2.50.6 to 2.51.0
- 41b1d93: Bump rollup from 2.51.0 to 2.51.1
- 03528a0: Bump postcss from 8.3.0 to 8.3.1
- e69b457: Bump @babel/plugin-proposal-class-properties from 7.13.0 to 7.14.5
- 1eab107: Bump @babel/core from 7.14.3 to 7.14.5

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
