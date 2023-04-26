---
parent: Commands
title: modular test
---

# `modular test [options] [packages...]`

Search workspaces based on their `name` field in the `package.json` and test:

- Modular packages, according to their respective `modular.type`. In this case,
  `modular test` will act as an opinionated wrapper around
  [`jest`](https://jestjs.io/), which comes with out-of-the-box configuration.
- Non-Modular packages (i.e. packages without a `modular` configuration), only
  if they have a `test`
  [script](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#scripts),
  by running `yarn test` on the package's
  [workspace](https://classic.yarnpkg.com/en/docs/cli/workspace).

When the `[packages...]` argument is empty and no selective option has been
specified (for example when running `yarn modular test`), tests will be run for
all testable packages in the repo. When the `[packages...]` argument contains
one or more non-existing package name, the non-existing packages will be ignored
without an error. If any package or selective option have been defined but
Modular can't find any package to test, Modular will warn on `stdout` and exit
with code `0`.

Test order is unspecified by design, so please don't rely on the assumption that
certain tests will run before others, that Modular tests will run before
non-Modular tests, or that they will run sequentially. An exception to this,
valid only for Modular tests (that are run by Jest), is when
[the `--runinband` option is specified](https://jestjs.io/docs/cli#--runinband).

## Configuration

### `modular/setupEnvironment.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFiles`](https://jestjs.io/docs/en/configuration#setupfiles-array).

### `modular/setupTests.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFilesAfterEnv`](https://jestjs.io/docs/en/configuration#setupfilesafterenv-array).

## Command line options and arguments

### Arguments

`[packages ...]`: List of packages to test. Can be combined with multiple
selective options (`--ancestors`, `--descendants`, `--changed` and `--regex`).
Modular will generate a list of regular expressions that satisfies all options
passed which are then passed to Jest. The tests will run in non-predictable
order. When `packages` is empty and no selective options have been specified
(for example when running `yarn modular test`), all tests in the monorepo will
be executed. When `packages` contains one or more non-existing package name, the
non-existing packages will be ignored without an error. If any package or
selective option have been defined but the final set of regular expressions is
empty, Modular will write a message to `stdout` and exit with code `0`.

### Modular-specific options

`--jest`: Bypass Modular selective behaviour and flags, and send all provided
flags and options directly to the Jest process with Modular configuration.
Useful when running `modular test` from IntelliJ.

`--ancestors`: Take the packages specified by the user via arguments or options
and add their ancestors (i.e. the packages that have a direct or indirect
dependency on them) to the test list.

`--descendants`: Take the packages specified by the user via arguments or
options and add their descendants (i.e. the packages they directly or indirectly
depend on) to the test list.

`--changed`: Take the packages specified by the user via arguments or options
and add all the packages whose workspaces contain files that have changed,
calculated comparing the current state of the git repository with the branch
specified by `compareBranch` or, if `compareBranch` is not set, with the default
branch.

`--debug`: Add the `--inspect-brk` option to the Node.js process executing Jest
to allow a debugger to be attached to the running process. For more information,
[see the Node.js debugging guide](https://nodejs.org/en/docs/guides/debugging-getting-started/).

`--compareBranch <branch>`: Specify the comparison branch used to determine
which files have changed when using the `changed` option. If this option is used
without `changed`, the command will fail.

`--regex <regexes...>`: Select all the test files matching the specified regular
expressions. Can be combined with all the other selective options.

`--verbose`: Activate debug logging. Useful to see which packages have been
selected and which regular expression and arguments have been passed to the
underlying Jest process.

### Jest CLI Options

`modular test` additionally supports passing
[Jest CLI options](https://jestjs.io/docs/cli) to the underlying Jest process.

## Configuring IntelliJ

IntelliJ and `modular test` aren't compatible out of the box. To make it work,
modify the IntelliJ test configuration to use `modular test` with the `--jest`
flag.

The following is an example IntelliJ Jest configuration that uses
`modular test`:

- Jest package: `absolute_repo_path/node_modules/modular_scripts`

- Working directory: `absolute_repo_path/`

- Jest options: `test --jest`

## Escape Hatches

While `modular test` should work straight away for most projects there are some
instances where it might be necessary to overwrite the default configuration
provided by modular itself.

Much like `react-scripts` we support overriding a handful of configuration
through the `jest` property in the root `package.json`

- [collectCoverageFrom](#collectCoverageFrom)
- [coveragePathIgnorePatterns](#coveragePathIgnorePatterns)
- [coverageThreshold](#coverageThreshold)
- [moduleNameMapper](#moduleNameMapper)
- [modulePathIgnorePatterns](#modulePathIgnorePatterns)
- [testPathIgnorePatterns](#testPathIgnorePatterns)
- [testRunner](#testRunner)
- [transformIgnorePatterns](#transformIgnorePatterns)

### collectCoverageFrom

[_Documentation_](https://jestjs.io/docs/configuration#collectcoveragefrom-array)

Default: `['<rootDir>/**/src/**/*.{js,ts,tsx}', '!**/*.d.ts']`

An array of [glob patterns](https://github.com/micromatch/micromatch) indicating
a set of files for which coverage information should be collected. If a file
matches the specified glob pattern, coverage information will be collected for
it even if no tests exist for this file and it's never required in the test
suite.

Example:

```json
{
  "collectCoverageFrom": [
    "**/*.{js,jsx}",
    "!**/node_modules/**",
    "!**/vendor/**"
  ]
}
```

### coveragePathIgnorePatterns

[_Documentation_](https://jestjs.io/docs/configuration#coveragepathignorepatterns-arraystring)

Default: `[ '/__tests__/', '/node_modules/', 'serviceWorker.ts', ]`

An array of regexp pattern strings that are matched against all file paths
before executing the test. If the file path matches any of the patterns,
coverage information will be skipped.

### coverageThreshold

[_Documentation_](https://jestjs.io/docs/configuration#coveragethreshold-object)

Default: `{}`

This will be used to configure minimum threshold enforcement for coverage
results. Thresholds can be specified as global, as a glob, and as a directory or
file path. If thresholds aren't met, jest will fail. Thresholds specified as a
positive number are taken to be the minimum percentage required. Thresholds
specified as a negative number represent the maximum number of uncovered
entities allowed.

### moduleNameMapper

[_Documentation_](https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring)

Default:

```javascript
{
    '^.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
    '^react-native$': 'react-native-web',
}
```

A map from regular expressions to module names or to arrays of module names that
allow to stub out resources, like images or styles with a single module.

The moduleNameMapper is merged with the `modular` defaults to provide common use
cases for static assets, like static assets including images, CSS and
CSS-modules.

### modulePathIgnorePatterns

[_Documentation_](https://jestjs.io/docs/configuration#modulepathignorepatterns-arraystring)

Default: `[]`

An array of regexp pattern strings that are matched against all module paths
before those paths are to be considered 'visible' to the module loader. If a
given module's path matches any of the patterns, it will not be `require()`-able
in the test environment.

### testPathIgnorePatterns

[_Documentation_](https://jestjs.io/docs/configuration#testpathignorepatterns-arraystring)

Default: `[/node_modules/]`

An array of regexp pattern strings that are matched against all test paths
before executing the test. If the test path matches any of the patterns, it will
be skipped.

### testRunner

[_Documentation_](https://jestjs.io/docs/configuration#testrunner-string)

Default: `jest-circus`

This option allows the use of a custom test runner. The default is
`jest-circus`. A custom test runner can be provided by specifying a path to a
test runner implementation.

This can be used to revert to the previous `jest` default testRunner
(`jest-jasmine2`) in cases where `circus` is not yet compatible with an older
codebase.

### transformIgnorePatterns

[_Documentation_](https://jestjs.io/docs/configuration#transformignorepatterns-arraystring)

Default:
`[ '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$', '^.+\\.module\\.(css|sass|scss)$', ]`

An array of regexp pattern strings that are matched against all source file
paths before transformation. If the file path matches any of the patterns, it
will not be transformed.
