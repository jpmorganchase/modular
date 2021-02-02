import createModularApp from '../cli';
import fs from 'fs-extra';
import path from 'path';
import tree from 'tree-view-for-tests';
import tmp from 'tmp';

jest.setTimeout(10 * 60 * 1000);

// We want to omit any information that makes our snapshots
// fragile and therefore censor the author and package versions
// using `?`.
async function readCensoredPackageJson(
  packageJsonPath: string,
): Promise<unknown> {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  function censorDiffering(packageJson: any): any {
    packageJson.author = '?';

    for (const dependencyTypeProperty of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      if (packageJson[dependencyTypeProperty]) {
        // This replaces the version numbers of packages with `?`.
        packageJson[dependencyTypeProperty] = Object.fromEntries(
          Object.entries(
            packageJson[dependencyTypeProperty],
          ).map(([packageName]) => [packageName, '?']),
        );
      }
    }

    return packageJson;
  }

  return censorDiffering(await fs.readJson(packageJsonPath));
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}

const repoName = 'test-repo';
let destination: string;
let tmpDirectory: tmp.DirResult;
beforeEach(() => {
  tmpDirectory = tmp.dirSync({ unsafeCleanup: true });
  destination = path.join(tmpDirectory.name, repoName);
});

afterEach(() => {
  //remove project
  tmpDirectory.removeCallback();
  // @ts-ignore
  destination = undefined;
});

describe('create-modular-react-app', () => {
  it('should create a project', async () => {
    createModularApp({ _: [destination] });
    expect(tree(destination)).toMatchInlineSnapshot(`
      "test-repo
      ├─ .editorconfig #1p4gvuw
      ├─ .eslintignore #1ot2bpo
      ├─ .gitignore #21yvq5
      ├─ .prettierignore #10uqwgj
      ├─ .vscode
      │  ├─ extensions.json #1i4584r
      │  ├─ launch.json #15fzacl
      │  └─ settings.json #xncm1d
      ├─ README.md #1nksyzj
      ├─ modular
      │  ├─ setupEnvironment.ts #m0s4vb
      │  └─ setupTests.ts #bnjknz
      ├─ package.json
      ├─ packages
      │  ├─ README.md #14bthrh
      │  └─ app
      │     ├─ package.json
      │     ├─ public
      │     │  ├─ favicon.ico #6pu3rg
      │     │  ├─ index.html #1wohq3p
      │     │  ├─ logo192.png #1nez7vk
      │     │  ├─ logo512.png #1hwqvcc
      │     │  ├─ manifest.json #19gah8o
      │     │  └─ robots.txt #1sjb8b3
      │     ├─ src
      │     │  ├─ App.css #1o0zosm
      │     │  ├─ App.tsx #c80ven
      │     │  ├─ __tests__
      │     │  │  └─ App.test.tsx #lrjomi
      │     │  ├─ index.css #o7sk21
      │     │  ├─ index.tsx #zdn6mw
      │     │  ├─ logo.svg #1okqmlj
      │     │  └─ react-app-env.d.ts #1dm2mq6
      │     └─ tsconfig.json #6rw46b
      ├─ tsconfig.json #xubky9
      └─ yarn.lock"
    `);
    expect(
      await readCensoredPackageJson(path.join(destination, 'package.json')),
    ).toMatchInlineSnapshot(`
      Object {
        "author": "?",
        "dependencies": Object {
          "@testing-library/dom": "?",
          "@testing-library/jest-dom": "?",
          "@testing-library/react": "?",
          "@testing-library/user-event": "?",
          "@types/jest": "?",
          "@types/node": "?",
          "@types/react": "?",
          "@types/react-dom": "?",
          "eslint": "?",
          "eslint-config-modular-app": "?",
          "modular-scripts": "?",
          "prettier": "?",
          "react": "?",
          "react-dom": "?",
          "typescript": "?",
        },
        "eslintConfig": Object {
          "extends": "modular-app",
        },
        "license": "MIT",
        "main": "index.js",
        "modular": Object {
          "type": "root",
        },
        "name": "test-repo",
        "prettier": Object {
          "printWidth": 80,
          "proseWrap": "always",
          "singleQuote": true,
          "trailingComma": "all",
        },
        "private": true,
        "scripts": Object {
          "build": "modular build app",
          "lint": "eslint . --ext .js,.ts,.tsx",
          "prettier": "prettier --write .",
          "start": "modular start app",
          "test": "modular test",
        },
        "version": "1.0.0",
        "workspaces": Array [
          "packages/*",
        ],
      }
    `);
    expect(
      await readCensoredPackageJson(
        path.join(destination, 'packages', 'app', 'package.json'),
      ),
    ).toMatchInlineSnapshot(`
      Object {
        "author": "?",
        "browserslist": Object {
          "development": Array [
            "last 1 chrome version",
            "last 1 firefox version",
            "last 1 safari version",
          ],
          "production": Array [
            ">0.2%",
            "not dead",
            "not op_mini all",
          ],
        },
        "dependencies": Object {},
        "modular": Object {
          "type": "app",
        },
        "name": "app",
        "private": true,
        "version": "0.1.0",
      }
    `);
  });

  it('should create a project without git metadata', () => {
    createModularApp({ _: [destination], repo: false });
    expect(fs.existsSync(path.join(destination, '.git'))).toEqual(false);
  });
});
