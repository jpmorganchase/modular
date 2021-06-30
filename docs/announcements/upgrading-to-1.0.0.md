# Upgrading to 1.0.0

With the release of `1.0.0` we have removed the dependency of `craco` and
`react-scripts` from the `modular` codebase. This is really exciting for us as
it will allow for greater development as well develop our ability to scale to
working with larger monorepos and developing solutions for cross-app builds /
typechecking, etc.

## Removing `react-scripts` dependency.

The Create React App (CRA) controllers in `react-scripts` will no longer be
installed with `modular` 1.0.0. This is a significant breaking change as you
will not be able to rely on all of the CRA conventions. While most features are
retained we have streamlined the features which we expose.

### `react-app-env.d.ts`

This file is created in `src/` of each `app` which is generated in `modular`.
Previously this imported the type definitions for static files which could be
imported from TypeScript files in apps.

Usually this file has a single line

```typescript
/// <reference types="react-scripts">
```

however this now needs to be updated to

```typescript
/// <reference types="modular-scripts/react-app-env">
```

### Eslint webpack plugin

The `eslint` webpack plugin for app builds has been disabled for several
versions now. However this release of `modular` removes this functionality
entirely in favor of programatically linting your files. This provides improved
build performance and linting performance since you can utilize eslints caching
functionality to perform incremental linting.
