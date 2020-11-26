import tree from '../index';
import path from 'path';

test('it can serialise a folder', () => {
  // this needs to be a folder that doesn't change during tests,
  // so can't include any .test.ts files that actually use this.
  // I picked one of our packages instead.
  expect(tree(path.join(__dirname, '../../../create-modular-react-app')))
    .toMatchInlineSnapshot(`
    "create-modular-react-app
    ├─ .npmignore #1rstiru
    ├─ CHANGELOG.md
    ├─ README.md #r0jsfd
    ├─ package.json
    ├─ src
    │  ├─ __tests__
    │  │  └─ index.test.ts #u6q4fo
    │  ├─ cli.ts #1pgxu36
    │  └─ index.ts #un0l9d
    └─ template
       ├─ README.md #1nksyzj
       ├─ gitignore #1ugsijf
       ├─ modular
       │  └─ setupTests.ts #bnjknz
       ├─ packages
       │  └─ README.md #14bthrh
       └─ tsconfig.json #1y19cv2"
  `);
});
