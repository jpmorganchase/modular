'use strict';
/**
 * Stricter variant of the default index.js configuration
 * * Adds import sorting rules
 */

module.exports = {
  extends: [require.resolve('./index')],
  overrides: [
    {
      files: ['**/*.ts?(x)', '**/*.js?(x)'],
      rules: {
        'no-multiple-empty-lines': 1,
        'sort-imports': [
          1,
          {
            ignoreDeclarationSort: true,
            ignoreCase: true,
          },
        ],
        'import/order': [
          1,
          {
            groups: [
              'builtin',
              'external',
              'internal',
              ['parent', 'sibling'],
              'type',
            ],
            pathGroups: [
              {
                pattern: 'react+(|-native)',
                group: 'external',
                position: 'before',
              },
            ],
            pathGroupsExcludedImportTypes: ['react+(|-native'],
            'newlines-between': 'never',
          },
        ],
      },
    },
  ],
};
