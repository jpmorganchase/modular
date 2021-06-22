import tree from '../index';
import path from 'path';

test('it can serialise a folder', () => {
  // this needs to be a folder that doesn't change during tests,
  // so can't include any .test.ts files that actually use this.
  // I picked one of our packages instead.

  expect(tree(path.join(__dirname, '../../../modular-views.macro')))
    .toMatchInlineSnapshot(`
    "modular-views.macro
    ├─ CHANGELOG.md
    ├─ README.md #16yav87
    ├─ package.json
    ├─ src
    │  ├─ __tests__
    │  │  ├─ .eslintrc.json #ofb4ml
    │  │  ├─ fixture.js #rm4stb
    │  │  └─ index.test.ts #hzaled
    │  └─ index.macro.ts #wgikox
    └─ tsconfig.json #11buryo"
  `);
});
