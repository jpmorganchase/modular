const OFF = 'off';

module.exports = {
  root: true,
  extends: [
    'plugin:modular-app/recommended'
  ],  
  overrides: [
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
      },
    },
  ],
};
