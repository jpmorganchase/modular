This is a monorepository initialised with [Modular](https://modular.js.org/)

## Commands available

- [Add](https://modular.js.org/commands/add/) - Add a new Modular package to the
  monorepo
- [Analyze](https://modular.js.org/commands/analyze/) - Analyzes the
  dependencies of a package from its source code, emitting JSON to `stdout`.
- [Build](https://modular.js.org/commands/build/) - Search workspaces based on
  their name field in the `package.json` and build them according to their
  respective `modular.type`, in order of dependency.
- [Check](https://modular.js.org/commands/check/) - Check the modular root repo
  has [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/),
  modular packages are set up properly and check the package tree for issues
  with dependencies.
- [Lint](https://modular.js.org/commands/lint/) - Check the diff between the
  current branch and the remote origin default branch and lint the source files
  that have changes. In CI, lint the entire codebase.
- [Start](https://modular.js.org/commands/start/) - Run the selected Modular
  `app`, `esm-view` or `view` locally.
- [Test](https://modular.js.org/commands/test/) - Run [Jest](https://jestjs.io/)
  tests against a selection of Modular packages.
- [Typecheck](https://modular.js.org/commands/typecheck/) - Report the semantic,
  syntactic, and declaration type errors found in your code.
- [Workspace](https://modular.js.org/commands/workspace/) - Prints information
  about the monorepository to the console. Like
  [`yarn workspaces info`](https://classic.yarnpkg.com/lang/en/docs/cli/workspaces/#toc-yarn-workspaces-info),
  but extended with modular metadata about package type and public/private
  status.

## Package types

| Type                                                         | [start](https://modular.js.org/commands/start/) | [build](https://modular.js.org/commands/build/) | [test](https://modular.js.org/commands/test/) | [lint](https://modular.js.org/commands/lint/) | Custom index / assets      | Bundled               | Entry-point                    |
| ------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------- | --------------------------------------------- | --------------------------------------------- | -------------------------- | --------------------- | ------------------------------ |
| [`app`](https://modular.js.org/package-types/app/)           | ✅                                              | ✅                                              | ✅                                            | ✅                                            | ✅                         | ✅                    | `src/index.tsx`                |
| [`esm-view`](https://modular.js.org/package-types/esm-view/) | ✅                                              | ✅                                              | ✅                                            | ✅                                            | ❌                         | ✅†                   | `src/index.tsx`                |
| [`package`](https://modular.js.org/package-types/package/)   | ❌                                              | ✅                                              | ✅                                            | ✅                                            | **N/A**                    | ❌                    | `main` field of `package.json` |
| [`view`](https://modular.js.org/package-types/view/)         | ✅                                              | ✅                                              | ✅                                            | ✅                                            | ❌                         | ❌                    | `main` field of `package.json` |
| [`source`](https://modular.js.org/package-types/source/)     | ❌                                              | ❌                                              | ✅                                            | ✅                                            | **N/A**                    | **N/A** - never built | **N/A** - never built          |
| [`template`](https://modular.js.org/package-types/template/) | ❌                                              | ❌                                              | ✅                                            | ✅                                            | Depends on the target type | **N/A** - never built | **N/A** - never built          |

† For ESM Views, external dependencies are rewritten to point to a CDN

## Configuration

### Example with defaults

##### `.modular.js`

```js
module.exports = {
  useModularEsbuild: false,
  externalCdnTemplate: 'https://esm.sh/[name]@[resolution]',
  externalBlockList: [],
  externalAllowList: ['**'],
  publicUrl: '',
  generateSourceMap: true,
};
```

### Options

- `useModularEsbuild`: Use [esbuild](https://esbuild.github.io/) instead of
  default Webpack. Only affects Apps and ESM Views. Default: _false_.
- `externalCdnTemplate`: Template to resolve the URL used to fetch packages from
  a CDN. Only applies to ESM Views. Default:
  `https://esm.sh/[name]@[resolution]`
- `externalBlockList`: External oackages that should be bundled and not fetched
  from a CDN. Applies only to ESM Views. Default: _no package_.
- `externalAllowList`: External packages that should be fetched from a CDN.
  Applies only to ESM Views. Default: _all_.
- `publicUrl`: Sub-path from which the SPA is served. Applies only to Apps and
  ESM Views when served standalone. Default: _/_.
- `generateSourceMap`: Should build process generate source maps? Default:
  _true_.
