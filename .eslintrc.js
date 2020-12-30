const OFF = 'off';

module.exports = {
  root: true,
  extends: [
    'plugin:modular-app/recommended'
  ],  
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
        '@typescript-eslint/ban-ts-comment': OFF,
      },
    },
    {
      // Disable rules within templates that are fired erroneously.
      files: ['packages/create-modular-react-app/template/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': OFF,
        '@typescript-eslint/no-unsafe-call': OFF,
        'import/no-extraneous-dependencies': OFF,
      },
    },
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
  ],
};
