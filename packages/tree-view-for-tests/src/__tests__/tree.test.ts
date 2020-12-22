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
    │  │  └─ index.test.ts #1aq0qbk
    │  ├─ cli.ts #17tb5ia
    │  └─ index.ts #un0l9d
    └─ template
       ├─ .editorconfig #1p4gvuw
       ├─ .vscode
       │  ├─ extensions.json #6p4679
       │  └─ settings.json #xncm1d
       ├─ README.md #1nksyzj
       ├─ gitignore #1ugsijf
       ├─ modular
       │  ├─ setupEnvironment.ts #m0s4vb
       │  └─ setupTests.ts #bnjknz
       ├─ packages
       │  └─ README.md #14bthrh
       └─ tsconfig.json #e5344q"
  `);
});
