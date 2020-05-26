module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
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
  plugins: ['react', 'react-hooks'],
  reportUnusedDisableDirectives: true,
  rules: {},
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
