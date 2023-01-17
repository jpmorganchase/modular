---
parent: Commands
title: modular test
---

# `modular test [options] [packages...]`

`test` is an opinionated wrapper around [`jest`](https://jestjs.io/) which runs
tests against the entire `modular` project. It comes with out-of-the-box
configuration and opinionation.

## Configuration

### `modular/setupEnvironment.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFiles`](https://jestjs.io/docs/en/configuration#setupfiles-array).

### `modular/setupTests.ts`

This contains the setup for tests corresponding to
[`jest.config.js#setupFilesAfterEnv`](https://jestjs.io/docs/en/configuration#setupfilesafterenv-array).

## Command line options and arguments

### Arguments

`[packages ...]`: Packages is a list of packages that the user wants to run a
test on. The specified set of packages can be further agumented by the selective
test options (`--ancestors`, `--descendants` and `--changed`). Modular will take
all the selected packages, generate a list of regular expressions based on their
location on disk and finally merge those regular expressions to the ones
optionally specified by the user with the `--regex` option. The resulting set of
regular expressions will be passed to the underlying Jest process and the
identified test files will be run in non-predictable order. When `packages` is
empty and no selective options have been specified (for example when running
`yarn modular test`), all tests in the monorepo will be executed. When
`packages` contains one or more non-existing package name, the non-existing
packages will be ignored without an error. If any package or selective option
have been defined but the final set of regular expressions is empty, Modular
will write a message to `stdout` and exit with code `0`.

### Modular-specific options

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
