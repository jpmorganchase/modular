# `modular convert`

Converts the react app in the current directory into a modular project with a
modular app workspace.

This action is `atomic` so if an error occurs while converting, it will stash
any changes made and bring the repo back to the previous state prior to the
attempt.

- Sets up the current directory as a modular project with a `packages/`
  workspaces

- Moves the current react app source content (`src/` and `public/`) into a
  modular app within `packages/` workspace

- Relocates setupTests file from `src/` to `modular/`

- Updates the `react-app-env.d.ts` file within the modular app to reference
  modular-scripts for types

- Updates `tsconfig.json` to include the modular packages workspace

- Removes `react-scripts` as a dependency and installs
  eslint-config-modular-app. You can point to it by adding 'modular-app' to the
  extends array in your eslint config.
