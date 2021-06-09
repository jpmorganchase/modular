# `modular test`

`test` is an opionated wrapper around [`jest`](https://jestjs.io/) which runs
tests against the entire `modular` project. It comes with out-of-the-box
configuration and opinionation.

## Escape Hatches

While `modular test` should work straight away for most projects there are some
instances where it might be necessary to overwrite the default configuration
provided by modular itself.

Much like `react-scripts` it's possible to update configuration for `jest`
through `package.json` properties.

The documentation for these escape hatches are taken directly from the
[jest documentation]()

### collectCoverageFrom

(_Documentation_](https://jestjs.io/docs/configuration#collectcoveragefrom-array)
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

(_Documentation_](https://jestjs.io/docs/configuration#coveragepathignorepatterns-arraystring)
Default: `[ '/__tests__/', '/node_modules/', 'serviceWorker.ts', ]`

An array of regexp pattern strings that are matched against all file paths
before executing the test. If the file path matches any of the patterns,
coverage information will be skipped.

### coverageThreshold

(_Documentation_)[https://jestjs.io/docs/configuration#coveragethreshold-object]
Default: `{}`

This will be used to configure minimum threshold enforcement for coverage
results. Thresholds can be specified as global, as a glob, and as a directory or
file path. If thresholds aren't met, jest will fail. Thresholds specified as a
positive number are taken to be the minimum percentage required. Thresholds
specified as a negative number represent the maximum number of uncovered
entities allowed.

```json
{
  ...
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": -10
      }
    }
  }
}
```

### moduleNameMapper

(_Documentation_)[https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring]
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

(_Documentation_)[https://jestjs.io/docs/configuration#modulepathignorepatterns-arraystring]
Default: `[]`

An array of regexp pattern strings that are matched against all module paths
before those paths are to be considered 'visible' to the module loader. If a
given module's path matches any of the patterns, it will not be `require()`-able
in the test environment.

### testPathIgnorePatterns

(_Documentation_)[https://jestjs.io/docs/configuration#testpathignorepatterns-arraystring]
Default: `[/node_modules/]`

An array of regexp pattern strings that are matched against all test paths
before executing the test. If the test path matches any of the patterns, it will
be skipped.

### testRunner

(_Documentation_)[https://jestjs.io/docs/configuration#testrunner-string]
Default: `jest-circus`

This option allows the use of a custom test runner. The default is
`jest-circus`. A custom test runner can be provided by specifying a path to a
test runner implementation.

This can be used to revert to the previous `jest` default testRunner -
`jest-jasmine2` in cases where `circus` is not yet compatible with an older
codebase.

### transformIgnorePatterns

(_Documentation_)[https://jestjs.io/docs/configuration#transformignorepatterns-arraystring]
Default:
`[ '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$', '^.+\\.module\\.(css|sass|scss)$', ]`

An array of regexp pattern strings that are matched against all source file
paths before transformation. If the file path matches any of the patterns, it
will not be transformed.
