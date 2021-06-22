import tree from '../index';
import path from 'path';

test('it can serialise a folder', () => {
  // this needs to be a folder that doesn't change during tests,
  // so can't include any .test.ts files that actually use this.
  // I picked one of our packages instead.

  expect(tree(path.join(__dirname, '../../../eslint-config-modular-app')))
    .toMatchInlineSnapshot(`
    "eslint-config-modular-app
    ├─ CHANGELOG.md
    ├─ README.md #1gd0v2k
    ├─ index.js #10qqo8n
    └─ package.json"
  `);
});
