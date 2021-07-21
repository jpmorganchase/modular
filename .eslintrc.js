const OFF = 'off';

module.exports = {
  root: true,
  plugins: ['modular-app'],
  extends: ['plugin:modular-app/recommended', 'modular-app'],
  overrides: [
    {
      files: 'packages/modular-scripts/src/__tests__/**/*',
      rules: {
        'modular-app/no-private-imports': OFF,
      },
    },
    {
      files: 'packages/modular-scripts/types/**/*',
      rules: {
        'react/jsx-pascal-case': OFF,
      },
    },
    {
      // if we want to use js in this repo, then they have
      // to be explitly marked as modules
      files: '**/*.js',
      parserOptions: {
        sourceType: 'script',
        ecmaFeatures: {
          impliedStrict: true
        },
      },
    },
  ],
};
