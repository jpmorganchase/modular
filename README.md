# modular

`modular` allows you to write and deploy applications, written as JavaScript
modules, across multiple repositories.

It consists of:

- a spec for tracking and resolving dependencies
- a development server to write and debug code locally
- a tool to build and deploy these assets
- documentation, recipes, and guidance

## why (or rather, why not)

- You should only use `modular` for building loosely coupled JavaScript
  applications; i.e. when the JavaScript code for one application/product is
  split across multiple repositories. If your application does NOT need this,
  consider a 'traditional' alternative instead.
- Perhaps you're migrating a 'legacy' multi-repository application to a single
  repository; `modular` can help you get there by establishing dependencies and
  using code across repos before actually moving them into one.
- Initial bundle size and/or TTFI isn't a very big concern. You're fine if it
  takes longer than normal for your application to start up. Examples include
  applications, dashboards, trading desks, etc. This is NOT to say that using
  `modular` results in big applications; it's to give fair warning that with
  runtime dependency resolution, it's much harder to optimize bundle size. This
  will be alleviated in the future.
- Maybe a monolithic repo approach has led to wasted time in ops, builds, and
  communication. Perhaps your tests and builds take too long. Or you have many
  teams working on a single application, yet each team is fairly independent,
  and working together in the same repo is causing friction. First, try as hard
  as you can to solve those problems. Perhaps your tests and builds could be
  optimized, made incremental, or automated by CI. Perhaps you can reduce the
  noise from so many PRs and changes by leveraging communication tools (chat,
  groups, etc). Only once you've exhausted those options, consider splitting up
  your repositories and taking on a new operations burden with `modular`.

## what it doesn't do

- services
- helper libraries, or any code really
- loaders and other bundler specialities (caveat: we can leverage our infra to
  serve any static assets, but that's beyond the scope of this document)
- tests
- styles

## design principles

- You can incrementally add `modular` to your project. It can live alongside
  your current tooling.
- No explicit runtime dependencies. There are no libraries to import in your
  code, nor any specific structure to follow (beyond what's considered standard,
  or common sense).
- Design for obsolescence; this infra should disappear as standards/tools
  mature. Indeed, modular should be ideally be consumed by other tools, making
  it unnecessary in the future.

## modules

Modules for modular are modeled as
[JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

```jsx
[sample module]
```

We follow established standards for configuration, to reduce boilerplate and
overhead. As such, configuration like entry points and external dependencies are
declared in a
[package.json](https://nodejs.org/en/knowledge/getting-started/npm/what-is-the-file-package-json/)
file.

```json
{
  "name": "my-application",
  "dependencies": {
    "react": "16.13.0",
    "react-dom": "16.13.0"
  }
}
```

Inside your code, dependencies are either referenced by a local path inside the
same repo, or by their name (as declared in `package.json`).

```jsx
import Chart from '@my/chart';
import Graph from '@my/graph';
import Link from 'react-router';

export default function App() {
  return (
    <div>
      <Graph src="/data" />
      <Chart src="/data" />
      <Link to="/more-info" />
    </div>
  );
}
```

`modular` does not enforce any syntax or other restrictions on the code you
write. It only asks that you generate a package including the modules and assets
that need to be served.

## `modular build`

This command runs in conjunction with your existing build system. It verifies
the structure of your modules, and generates metadata for it to be picked up and
consumed by other modules (if required)

## `modular dev`

runs an application, where third party dependencies are fetched from a
cdn/registry, second-party components (ie - your product's modules, but from
other repos) are fetched either from a cdn, or a staging server, or aliased
locally, and your 'local' modules are served from your own repo.

## `modular publish`

`modular publish` publishes your package to an npm registry. You may want to
setup your own registry, or use npm's private registry for your application
code.

## `modular check`

A script to quickly check whether the spec is being upheld

- check whether dependencies exist
- imports and exports resolve cleanly
- etc

## registry/cdn

The cdn is a service running over your registry that can serve javascript (and
possibly other static assets). It's very similar to unpkg.com, or pikapkg, in
that it serves modules and other static assets directly from its registry. As a
consequence of that, it recognizes semver and such too.

## how to adopt modular

- (some script that generates the mapping)
- understand semver
- setup communication between the teams informing of updates and so on
- setup smoke tests and resilience tests

## optimisations

- prefetch common stuff
- use analytics to detect prefetches?

## removing `modular`

Perhaps you've decided to put everything back in one repo, or your'e not
satisfied with the performace and/or other tradeoffs. Because there're are no
explicit dependencies, you can go back to 'traditional' models without much
fuss. You can continue to use the registry if you'd like to, or not.

## FAQs
