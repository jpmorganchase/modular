# Linting

Projects created with
[`create-modular-react-app`](https://www.npmjs.com/package/create-modular-react-app)
start with a standard ESLint configuration out-of-the-box, with no setup
required. The standard config is just
[`eslint-config-react-app`](https://www.npmjs.com/package/eslint-config-react-app),
and the dependencies are bundled for you.

Lint support is provided via modular's
[`eslint-config-modular-app`](https://www.npmjs.com/package/eslint-config-modular-app)
package.

## Customisation

If you want to extend the ESLint configuration in a modular repo, create a file
named `.eslintrc.js` in your project's root folder with the following content:

    module.exports = {
      extends: "modular-app",
    }

That's it! Add your additional config to this file. Read more about
[extending sharable configuration packages here](https://eslint.org/docs/user-guide/configuring/configuration-files#using-a-shareable-configuration-package).

### Example

It is common to modify a small number of linting rules based on your project's
requirements. For example, below we turn off two TypeScript rules. Observe that
`@typescript-eslint` is bundled with modular's `eslint-config-modular-app`
package, so you don't need to add any dependencies to your project.

    module.exports = {
      extends: ['modular-app'],
      overrides: [
        {
          files: ['*.ts', '*.tsx'],
          rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
          },
        },
      ],
    };

## Related Commands

- [`lint`](../commands/11_lint)
