'use strict';

// Short hand codes for the values eslint expects
// Might feel like overkill, but is also effectively visually
// when scanning through the config and looking for values.

// eslint-disable-next-line  no-unused-vars
const ERROR = 'error';
// eslint-disable-next-line  no-unused-vars
const WARN = 'warn';
const OFF = 'off';

module.exports = {
  extends: ['react-app'],
  parser: '@babel/eslint-parser',
  reportUnusedDisableDirectives: true,
  overrides: [
    {
      files: ['**/__tests__/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}'],
      extends: [
        'plugin:jest/recommended',
        'plugin:jest/style',
        'plugin:jest-dom/recommended',
        'plugin:testing-library/react',
      ],
      plugins: ['jest', 'jest-dom', 'testing-library'],
    },
    {
      files: ['*.{ts,tsx}'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/typescript',
      ],

      plugins: ['@typescript-eslint'],
      rules: {
        // TypeScript compilation already ensures that default imports exist in the referenced module
        'import/default': OFF,
        '@typescript-eslint/ban-ts-comment': OFF,
      },
    },
  ],
};
