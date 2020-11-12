## tree-view-for-tests

This is used for generating a tree view of a folder structure, with hashes of
files contents. Useful for tests, particularly when used with inline snapshots.
Example usage:

```jsx
import tree from 'tree-view-for-tests';

// ...
expect(tree('path/to/folder/')).toMatchInlineSnapshot();
```

Example output:

```
  create-modular-react-app
  ├─ .npmignore #1rstiru
  ├─ CHANGELOG.md #1qszd4f
  ├─ package.json
  ├─ src
  │  ├─ __tests__
  │  │  └─ index.test.ts #1lutspt
  │  ├─ cli.ts #1m487e6
  │  └─ index.ts #govck
  └─ template
     ├─ README.md #1nksyzj
     ├─ gitignore #1ugsijf
     ├─ modular
     │  └─ setupTests.ts #bnjknz
     ├─ packages
     │  └─ README.md #14bthrh
     ├─ shared
     │  └─ README.md #1aqc5yw
     └─ tsconfig.json #1y19cv2
```
