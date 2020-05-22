module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'prettier',
    'prettier/react',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    // See: https://github.com/typescript-eslint/typescript-eslint/issues/1928#issuecomment-617969784
    project: ['./tsconfig.eslint.json'],
    sourceType: 'module',
    // `.eslintrc.js` needs to be a JavaScript file to access `__dirname` since we want linting to
    // work if we run it from a different current working directory.
    // See: https://github.com/typescript-eslint/typescript-eslint/issues/101#issuecomment-499303058
    //
    // However, that gives an error message because `__dirname` is defined within `@types/node` which
    // we do not currently load. Therefore, we disable the following rule because the project is a
    // mixture of browser-based and Node-based code, and the solutions to this are either overkill
    // or unelegant (e.g. solution-style `tsconfig.json`s, or for linting only using overrides to enable
    // TypeScript eslint rules only on TypeScript files).
    // TODO: https://github.com/jpmorganchase/modular/issues/9
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react'],
  rules: {},
  settings: {
    react: {
      version: 'detect',
    },
  },
};
