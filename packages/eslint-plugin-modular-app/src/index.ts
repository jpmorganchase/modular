// The ESLint browser environment defines all browser globals as valid,
// even though most people don't know some of them exist (e.g. `name` or `status`).
// This is dangerous as it hides accidentally undefined variables.
// We blacklist the globals that we deem potentially confusing.
// To use them, explicitly reference them, e.g. `window.name` or `window.status`.
// See https://github.com/facebook/create-react-app/blob/3c2f2d4/packages/eslint-config-react-app/index.js#L19-L24
import restrictedGlobals from 'confusing-browser-globals';
import * as ESlint from 'eslint';

import ModularNoPrivateImports from './ModularNoPrivateImports';

const ERROR = 'error';
const WARN = 'warn';

interface Plugin {
  rules: Record<string, ESlint.Rule.RuleModule>;
  configs: Record<string, ESlint.Linter.Config>;
}

const plugin: Plugin = {
  rules: {
    'no-private-imports': ModularNoPrivateImports,
  },
  configs: {
    recommended: {
      env: {
        browser: true,
        es6: true,
        node: true,
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: 'babel-eslint',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      plugins: ['import', 'react', 'react-hooks', 'modular-app'],
      reportUnusedDisableDirectives: true,
      extends: [
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
        'prettier/react',
      ],
      // NOTE: When adding rules here, you need to make sure they are compatible with
      // `typescript-eslint`, as some rules such as `no-array-constructor` aren't compatible.
      rules: {
        // http://eslint.org/docs/rules/
        'no-restricted-globals': [ERROR, ...restrictedGlobals],

        // https://github.com/benmosher/eslint-plugin-import/tree/master/docs/rules
        'import/first': ERROR,
        'import/no-amd': ERROR,
        'import/no-anonymous-default-export': WARN,
        // disabling this because it doesn't consider local yarn workspaces
        // or root dependencies as legitimate, and we use it extensively.
        // 'import/no-extraneous-dependencies': ERROR,
        'import/no-webpack-loader-syntax': ERROR,
        'modular-app/no-private-imports': ERROR,
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
  },
};

export default plugin;
