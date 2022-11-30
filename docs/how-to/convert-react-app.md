---
parent: How To
nav_order: 1
title: Convert React App to Modular Project
---

# Convert a React App to a Modular Project

To convert an existing React app project into a Modular project, start by
creating a new Modular project:

` yarn create modular-react-app my-new-modular-project [--verbose] [--prefer-offline] [--repo]`

Once created:

- Replace the source code within the App workspace inside the `packages/`
  directory with your React app source content.
- Copy the dependencies from the old root package.json to the new Modular one
  within the App workspace

Your React app will now be a Modular App package.

Feel free to rename the workspace by following this guide:
[Rename Package](./rename-package).
