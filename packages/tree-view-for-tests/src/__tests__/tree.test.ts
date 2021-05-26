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
    │  │  └─ index.test.ts #qhhzh
    │  ├─ cli.ts #1sx9my
    │  └─ index.ts #1spcux6
    └─ template
       ├─ .editorconfig #1p4gvuw
       ├─ .eslintignore #1ot2bpo
       ├─ .prettierignore #10uqwgj
       ├─ .vscode
       │  ├─ extensions.json #1i4584r
       │  ├─ launch.json #15fzacl
       │  └─ settings.json #xncm1d
       ├─ README.md #1nksyzj
       ├─ gitignore #175wbq
       ├─ modular
       │  ├─ setupEnvironment.ts #m0s4vb
       │  └─ setupTests.ts #bnjknz
       ├─ packages
       │  └─ README.md #14bthrh
       └─ tsconfig.json #1h72lkd"
  `);
});
