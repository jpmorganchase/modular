# @modular-scripts/workspace-resolver

## 2.0.0

### Major Changes

- [#2391](https://github.com/jpmorganchase/modular/pull/2391)
  [`6209e17`](https://github.com/jpmorganchase/modular/commit/6209e17bbe90eaa0296c291ba26eafebf8a6591f)
  Thanks [@AlbertoBrusa](https://github.com/AlbertoBrusa)! - Modular's workspace
  resolver now ignores a workspace if covered by a .modularignore or .gitignore
  (.modularignore overrides .gitignore)

## 1.2.0

### Minor Changes

- [#2177](https://github.com/jpmorganchase/modular/pull/2177)
  [`8311ade`](https://github.com/jpmorganchase/modular/commit/8311ade225d977db2f6a91a14b915f55674b1eee)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Modular
  type as an additional property in workspace resolver

### Patch Changes

- [#2146](https://github.com/jpmorganchase/modular/pull/2146)
  [`db7acd0`](https://github.com/jpmorganchase/modular/commit/db7acd0d2fa0b896f99a0e7f4c745c8e0b790325)
  Thanks [@sgb-io](https://github.com/sgb-io)! - Remove requirement to build the
  package in local dev

## 1.1.0

### Minor Changes

- [#2093](https://github.com/jpmorganchase/modular/pull/2093)
  [`8e955c8`](https://github.com/jpmorganchase/modular/commit/8e955c82e357ed8e8aeb728866fa187851450122)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - Export
  computeAncestorWorkspaces

## 1.0.0

### Major Changes

- [#1978](https://github.com/jpmorganchase/modular/pull/1978)
  [`b2c9f74`](https://github.com/jpmorganchase/modular/commit/b2c9f74a0542a726d202a68c06bc1bae5c1df541)
  Thanks [@sgb-io](https://github.com/sgb-io)! - Introduce
  @modular-scripts/modular-types and @modular-scripts/workspace-resolver

### Minor Changes

- [#1983](https://github.com/jpmorganchase/modular/pull/1983)
  [`051ecf7`](https://github.com/jpmorganchase/modular/commit/051ecf7d257f883268abe73fd082d25615888906)
  Thanks [@cristiano-belloni](https://github.com/cristiano-belloni)! - - Add
  dependency resolver API
  - Add lightweight dependency type for users using the API separately

* [#2001](https://github.com/jpmorganchase/modular/pull/2001)
  [`12d9ea0`](https://github.com/jpmorganchase/modular/commit/12d9ea09a754af478470c8cdb1dc7114f53fd5c3)
  Thanks [@sgb-io](https://github.com/sgb-io)! - Integrate new yarn-agnostic
  workspace resolver
