---
parent: How To
nav_order: 1
title: Convert CRA Project to Modular Project
---

# Convert a Create React App project to a Modular Project

To convert an existing [Create React App](https://create-react-app.dev/) project
into a Modular app, start by creating a new Modular project as shown in the
[getting started documentation](../index.md):

`yarn create modular-react-app my-new-modular-project`

Once created:

- Replace the source code within the `app` workspace inside the `packages/`
  directory with your React app source content.
- Copy the dependencies from the old root package.json to the new Modular one
  within the `app` workspace.
  - Ensure the React version and other dependencies in the root Modular
    package.json are the same as those used in the React app.
- Copy over any necessary custom configurations, and ensure `modular start`
  `test` and `build` scripts succesfully start, test and build your app.

Your app will now be a Modular `app` package. You can change the package type in
the package's package.json `modular.type` field to `view` if more appropriate.

Feel free to rename the workspace by following this guide:
[Rename Package](./rename-package).
