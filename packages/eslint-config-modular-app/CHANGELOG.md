# eslint-config-modular-app

## 5.0.0

### Major Changes

- [#2370](https://github.com/jpmorganchase/modular/pull/2370)
  [`ef63eb3`](https://github.com/jpmorganchase/modular/commit/ef63eb3982e5984f72b7ea326a8c1da034c83253)
  Thanks [@AlbertoBrusa](https://github.com/AlbertoBrusa)! - Dropped Node 14
  support, added Node 20 support. Changed target to ES2017

## 4.1.0

### Minor Changes

- [#2369](https://github.com/jpmorganchase/modular/pull/2369)
  [`3141f92`](https://github.com/jpmorganchase/modular/commit/3141f9259afccff4fbac9d5428d4d4b7714b9911)
  Thanks [@AlbertoBrusa](https://github.com/AlbertoBrusa)! - Added new
  recommended eslint configuration that includes import sorting -
  "modular-app/recommended"

## 4.0.1

### Patch Changes

- [#2315](https://github.com/jpmorganchase/modular/pull/2315)
  [`9753190`](https://github.com/jpmorganchase/modular/commit/9753190b429523606a98566dd9eba1c3a5236737)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Selective
  `modular lint`

- [#2315](https://github.com/jpmorganchase/modular/pull/2315)
  [`9753190`](https://github.com/jpmorganchase/modular/commit/9753190b429523606a98566dd9eba1c3a5236737)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! -
  `modular lint` supports selective options `eslint-config-modular-app` doesn't
  depend on eslint-config-react-app anymore

## 4.0.0

### Major Changes

- [#2264](https://github.com/jpmorganchase/modular/pull/2264)
  [`75718c4`](https://github.com/jpmorganchase/modular/commit/75718c4feaa19216683523e0ec10165b40b2b059)
  Thanks [@AlbertoBrusa](https://github.com/AlbertoBrusa)! - Added Node 18
  engine support Upgraded Jest from 26 to 29 as 26 wasn't compatible with Node
  18 Upgraded to rollup-plugin-esbuild 5, dropping support for Node 14.17 and
  below Supported Node versions now: ^14.18.0 || >=16.10.0 || >=18.0.0 Changed
  Jest flag --watchAll default to false (was previously true if running locally
  and not in CI)

- [#2264](https://github.com/jpmorganchase/modular/pull/2264)
  [`75718c4`](https://github.com/jpmorganchase/modular/commit/75718c4feaa19216683523e0ec10165b40b2b059)
  Thanks [@AlbertoBrusa](https://github.com/AlbertoBrusa)! - Updated eslint to
  ^8.0.0 and minimum supported TypeScript version to 4.5.3

## 3.0.2

### Patch Changes

- [#2134](https://github.com/jpmorganchase/modular/pull/2134)
  [`704b3a4`](https://github.com/jpmorganchase/modular/commit/704b3a44f4f9766fe69e0dbac8eb667626cdb4a2)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-jest-dom from 3.9.2 to 3.9.4

* [#2143](https://github.com/jpmorganchase/modular/pull/2143)
  [`902e03a`](https://github.com/jpmorganchase/modular/commit/902e03a319aa0e19729932f2591238b583ad16d0)
  Thanks [@joshwooding](https://github.com/joshwooding)! - Fix Jest linting
  rules being applied to Cypress tests

## 3.0.1

### Patch Changes

- [#1713](https://github.com/jpmorganchase/modular/pull/1713)
  [`a0468bb`](https://github.com/jpmorganchase/modular/commit/a0468bb543a6159e6a5c8fd727da3be3153c29a1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-testing-library from 5.3.1 to 5.5.0

## 3.0.0

### Major Changes

- [#1564](https://github.com/jpmorganchase/modular/pull/1564)
  [`6a31ac9`](https://github.com/jpmorganchase/modular/commit/6a31ac9572dcc67cd74f85c4094c6fd11aa1dc6c)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-testing-library from 4.12.4 to 5.3.0

### Patch Changes

- [#1647](https://github.com/jpmorganchase/modular/pull/1647)
  [`591acf5`](https://github.com/jpmorganchase/modular/commit/591acf5219946468265b8ad2d40b01f1b1fc02df)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-testing-library from 5.3.0 to 5.3.1

* [#1628](https://github.com/jpmorganchase/modular/pull/1628)
  [`46dd6fd`](https://github.com/jpmorganchase/modular/commit/46dd6fd1790778ed2ac51992fa2b57a50b6e79d1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-react-hooks from 4.4.0 to 4.5.0

## 3.0.0-beta.1

### Patch Changes

- [#1628](https://github.com/jpmorganchase/modular/pull/1628)
  [`46dd6fd`](https://github.com/jpmorganchase/modular/commit/46dd6fd1790778ed2ac51992fa2b57a50b6e79d1)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-react-hooks from 4.4.0 to 4.5.0

## 3.0.0-beta.0

### Major Changes

- [#1564](https://github.com/jpmorganchase/modular/pull/1564)
  [`6a31ac9`](https://github.com/jpmorganchase/modular/commit/6a31ac9572dcc67cd74f85c4094c6fd11aa1dc6c)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-testing-library from 4.12.4 to 5.3.0

### Patch Changes

- [#1647](https://github.com/jpmorganchase/modular/pull/1647)
  [`591acf5`](https://github.com/jpmorganchase/modular/commit/591acf5219946468265b8ad2d40b01f1b1fc02df)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-testing-library from 5.3.0 to 5.3.1

## 2.0.5

### Patch Changes

- [#1525](https://github.com/jpmorganchase/modular/pull/1525)
  [`ea5b8c6`](https://github.com/jpmorganchase/modular/commit/ea5b8c6820c4ceb23224576e148726f474b88dfa)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-react-hooks from 4.3.0 to 4.4.0

## 2.0.4

### Patch Changes

- [#1518](https://github.com/jpmorganchase/modular/pull/1518)
  [`d896289`](https://github.com/jpmorganchase/modular/commit/d896289b7bda361676f643eba6c93f38ecc9afb3)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Revert
  node engine range

## 2.0.3

### Patch Changes

- [#1283](https://github.com/jpmorganchase/modular/pull/1283)
  [`918d1f1`](https://github.com/jpmorganchase/modular/commit/918d1f15b7ae27141ad180ff634aade6ca524117)
  Thanks [@LukeSheard](https://github.com/LukeSheard)! - Upgrade @babel scope
  packages in modular.

## 2.0.2

### Patch Changes

- [#1033](https://github.com/jpmorganchase/modular/pull/1033)
  [`d9f42fe`](https://github.com/jpmorganchase/modular/commit/d9f42fea338b0bf70968e4690bf2b5aa2ba108ff)
  Thanks [@steveukx](https://github.com/steveukx)! - Add extraneous dependencies
  and add lint rule to ensure dependencies always added

## 2.0.1

### Patch Changes

- [#1034](https://github.com/jpmorganchase/modular/pull/1034)
  [`51ddf73`](https://github.com/jpmorganchase/modular/commit/51ddf73c9e6a10f30077fed65da343ab49ef26fc)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-import from 2.25.2 to 2.25.3

* [#1028](https://github.com/jpmorganchase/modular/pull/1028)
  [`cfc537a`](https://github.com/jpmorganchase/modular/commit/cfc537a5ad6d5f5590d54d7d98a200a2e15067f3)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-react-hooks from 4.2.0 to 4.3.0

- [#1027](https://github.com/jpmorganchase/modular/pull/1027)
  [`919d34c`](https://github.com/jpmorganchase/modular/commit/919d34c6df58d61dfce2fc907b8db5bcb0b42988)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  @babel/eslint-parser from 7.16.0 to 7.16.3

* [#1035](https://github.com/jpmorganchase/modular/pull/1035)
  [`de004df`](https://github.com/jpmorganchase/modular/commit/de004df66e2d00960add70c4da89b148e5e9768a)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-jsx-a11y from 6.4.1 to 6.5.1

- [#1036](https://github.com/jpmorganchase/modular/pull/1036)
  [`0d7a6ef`](https://github.com/jpmorganchase/modular/commit/0d7a6ef4816e19be250252c45c424874973af163)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  eslint-plugin-react from 7.26.1 to 7.27.0

## 2.0.0

### Major Changes

- [#908](https://github.com/jpmorganchase/modular/pull/908)
  [`226ad45`](https://github.com/jpmorganchase/modular/commit/226ad45251ab1955bd955fac97407e263af9de76)
  Thanks [@LukeSheard](https://github.com/LukeSheard)! - Add exports fields to
  all packages.

### Patch Changes

- [#994](https://github.com/jpmorganchase/modular/pull/994)
  [`3b9af03`](https://github.com/jpmorganchase/modular/commit/3b9af03c54b3a9bb2a42434b0613ce9872c9e814)
  Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump
  @babel/eslint-parser from 7.15.8 to 7.16.0

## 1.0.11

### Patch Changes

- aea20e9: Bump eslint-plugin-import from 2.24.2 to 2.25.2

## 1.0.10

### Patch Changes

- cec8cec: Bump @typescript-eslint/parser from 4.31.1 to 4.33.0
- a0a066b: Bump @typescript-eslint/eslint-plugin from 4.31.1 to 4.33.0

## 1.0.9

### Patch Changes

- 5fd4341: Bump eslint-plugin-react from 7.25.2 to 7.26.1
- 25d3439: Bump @babel/eslint-parser from 7.15.4 to 7.15.8
- c782290: Bump eslint-plugin-react from 7.25.1 to 7.25.2
- da39007: Bump eslint-plugin-testing-library from 4.12.2 to 4.12.4

## 1.0.8

### Patch Changes

- 8e958aa: Bump eslint-plugin-flowtype from 5.9.2 to 5.10.0

## 1.0.7

### Patch Changes

- 2bb8d7d: Bump eslint-plugin-testing-library from 4.12.1 to 4.12.2
- 9bf1485: Bump eslint-plugin-jest-dom from 3.9.0 to 3.9.2
- ff09078: Bump @typescript-eslint/eslint-plugin from 4.31.0 to 4.31.1

## 1.0.6

### Patch Changes

- 5c6893f: Bump eslint-plugin-react from 7.24.0 to 7.25.1
- fefa3bc: Bump @typescript-eslint/eslint-plugin from 4.29.3 to 4.31.0
- b785b41: Bump @typescript-eslint/parser from 4.29.3 to 4.31.0
- dfa9a4a: Bump eslint-plugin-testing-library from 4.12.0 to 4.12.1
- f92c6eb: Bump eslint-plugin-flowtype from 5.9.0 to 5.9.2

## 1.0.5

### Patch Changes

- f9eb3a1: Bump eslint-plugin-testing-library from 4.11.0 to 4.12.0

## 1.0.4

### Patch Changes

- 8294ccd: Bump eslint-plugin-import from 2.24.1 to 2.24.2
- 1da34e4: Bump eslint-plugin-import from 2.23.4 to 2.24.1
- 7441b3f: Bump @typescript-eslint/parser from 4.28.5 to 4.29.3
- 785fe5d: Bump eslint-plugin-react-hooks from 4.0.8 to 4.2.0
- 604c499: Bump eslint-plugin-testing-library from 4.10.1 to 4.11.0
- 441496b: Bump eslint-plugin-flowtype from 5.8.1 to 5.9.0
- f1f66cd: Bump @typescript-eslint/eslint-plugin from 4.28.5 to 4.29.3

## 1.0.3

### Patch Changes

- 16b9556: Bump eslint-plugin-jsx-a11y from 6.3.1 to 6.4.1
- b45af6a: Bump @babel/eslint-parser from 7.14.7 to 7.15.0

## 1.0.2

### Patch Changes

- fe485c9: Bump @typescript-eslint/eslint-plugin from 4.28.4 to 4.28.5
- 6f3923c: Bump eslint-plugin-testing-library from 4.10.0 to 4.10.1
- b3a615c: Bump @typescript-eslint/parser from 4.28.4 to 4.28.5
- 78b8026: Bump eslint-plugin-jest from 24.3.6 to 24.4.0
- 429b124: Bump eslint-plugin-flowtype from 5.8.0 to 5.8.1

## 1.0.1

### Patch Changes

- 4394e2f: Bump @typescript-eslint/parser from 4.28.3 to 4.28.4
- 7538e4f: Bump eslint-plugin-testing-library from 4.9.1 to 4.10.0
- 2a95b96: Bump @typescript-eslint/eslint-plugin from 4.28.3 to 4.28.4
- 913da5f: Bump eslint-plugin-testing-library from 4.9.0 to 4.9.1
- a22f23c: Bump @typescript-eslint/eslint-plugin from 4.28.2 to 4.28.3
- 8e7650e: Bump @typescript-eslint/parser from 4.28.2 to 4.28.3

## 1.0.0

### Major Changes

- af8f49f: Remove react-scripts as a dependency and release major change.

### Patch Changes

- 732b487: Bump eslint-plugin-testing-library from 4.6.0 to 4.9.0
- 72842b6: Bump @typescript-eslint/eslint-plugin from 4.28.1 to 4.28.2
- 0cd7296: Bump @typescript-eslint/parser from 4.28.1 to 4.28.2

## 0.4.6

### Patch Changes

- b9c66e2: Add required dependency
- 983ba7a: Bump eslint-plugin-flowtype from 5.7.2 to 5.8.0
- bf9ff4e: Bump @typescript-eslint/parser from 4.28.0 to 4.28.1
- bc8558a: Bump @typescript-eslint/eslint-plugin from 4.28.0 to 4.28.1

## 0.4.5

### Patch Changes

- f377a3f: Bump @typescript-eslint/eslint-plugin from 4.27.0 to 4.28.0
- db8440b: Bump @typescript-eslint/parser from 4.27.0 to 4.28.0

## 0.4.4

### Patch Changes

- 9f1604f: Bump @typescript-eslint/parser from 4.26.1 to 4.27.0
- 82c0bba: Bump @typescript-eslint/parser from 4.26.0 to 4.26.1
- 3dfa404: Bump @typescript-eslint/eslint-plugin from 4.26.0 to 4.26.1

## 0.4.3

### Patch Changes

- e187ee7: Bump @typescript-eslint/parser from 4.25.0 to 4.26.0
- 9de19d4: Bump eslint-plugin-react from 7.23.2 to 7.24.0
- 73b4b12: Bump typescript from 4.2.4 to 4.3.2
- 8ae4126: Bump eslint-plugin-import from 2.23.3 to 2.23.4

## 0.4.2

### Patch Changes

- 308847e: Bumping versions for actually landing/releasing

## 0.4.1

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.4.1-next.0

### Patch Changes

- ecb9880: Bumping versions to overcome a bad prelease publish.

## 0.4.0

### Minor Changes

- 84ef2db: Enhance eslint-config-modular-app, add .prettierignore and
  .eslintignore files in templates

## 0.3.1

### Patch Changes

- e65e681: Enable in-browser lint experience, fix type requirements.

## 0.3.0

### Minor Changes

- 04623e9: Fix dependencies in eslint-config-modular-app, initialise new
  projects with typescript

## 0.2.0

### Minor Changes

- 1b34e70: Update craco and create-react-app
- 1b34e70: refactor the repository to become a modular project itself.

## 0.1.1

### Patch Changes

- This release fixes the missing build folders.

## 0.1.0

### Minor Changes

- This release adds support for multiple apps, and a simpler folder layout.
