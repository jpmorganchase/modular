// The ESLint browser environment defines all browser globals as valid,
// even though most people don't know some of them exist (e.g. `name` or `status`).
// This is dangerous as it hides accidentally undefined variables.
// We blacklist the globals that we deem potentially confusing.
// To use them, explicitly reference them, e.g. `window.name` or `window.status`.
// See https://github.com/facebook/create-react-app/blob/3c2f2d4/packages/eslint-config-react-app/index.js#L19-L24
const restrictedGlobals = require('confusing-browser-globals');

const ERROR = 'error';
const OFF = 'off';

module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
    'prettier/react',
  ],
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
  plugins: ['import', 'react', 'react-hooks'],
  reportUnusedDisableDirectives: true,

  // NOTE: When adding rules here, you need to make sure they are compatible with
  // `typescript-eslint`, as some rules such as `no-array-constructor` aren't compatible.
  rules: {
    // http://eslint.org/docs/rules/
    'no-restricted-globals': [ERROR, ...restrictedGlobals],

    // https://github.com/benmosher/eslint-plugin-import/tree/master/docs/rules
    'import/first': 'error',
    'import/no-amd': 'error',
    'import/no-anonymous-default-export': 'warn',
    'import/no-extraneous-dependencies': 'error',
    'import/no-webpack-loader-syntax': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['*.{ts,tsx}'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/typescript',
        'prettier/@typescript-eslint',
      ],
      parserOptions: {
        // See: https://github.com/typescript-eslint/typescript-eslint/issues/1928#issuecomment-617969784
        project: ['./tsconfig.json'],
        // `.eslintrc.js` needs to be a JavaScript file to access `__dirname` since we want linting to
        // work if we run it from a different current working directory.
        // See: https://github.com/typescript-eslint/typescript-eslint/issues/101#issuecomment-499303058
        // TODO: https://github.com/jpmorganchase/modular/issues/9
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
      rules: {
        // TypeScript compilation already ensures that default imports exist in the referenced module
        'import/default': OFF,
      },
    },
    {
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      extends: [
        'plugin:jest/recommended',
        'plugin:jest/style',
        'plugin:jest-dom/recommended',
        'plugin:testing-library/react',
      ],
      plugins: ['jest', 'jest-dom', 'testing-library'],
    },
  ],
};
