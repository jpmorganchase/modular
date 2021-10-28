# `modular start <packageName>`

Runs
[`react-scripts start`](https://create-react-app.dev/docs/getting-started#npm-start-or-yarn-start)
against the indicated app or view.

When starting a view, modular expects the the default export of the view's
`index.tsx` file to be a function that returns a component (Don't worry, this is
what modular views are initialized as). Modular will import this view as a
module within a template app, which we stage in a `node_modules/.modular`
folder. You can develop your view as you normally would an app and it will
automatically re-compile as you make changes in the view package.
