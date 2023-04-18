import createModularApp from '../';
import fs from 'fs-extra';
import path from 'path';
import { hashlessTree } from 'tree-view-for-tests';
import tmp from 'tmp';

// We want to omit any information that makes our snapshots
// fragile and therefore censor the author and package versions
// using `?`.
async function readCensoredPackageJson(
  packageJsonPath: string,
): Promise<unknown> {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
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
          Object.entries(packageJson[dependencyTypeProperty]).map(
            ([packageName]) => [packageName, '?'],
          ),
        );
      }
    }

    return packageJson;
  }

  return censorDiffering(await fs.readJson(packageJsonPath));
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}

describe('create-modular-react-app', () => {
  const repoName = 'test-repo';
  const tmpDirectories: tmp.DirResult[] = [];

  function createTempDirectory(): string {
    const tmpDirectory = tmp.dirSync({ unsafeCleanup: true });
    tmpDirectories.push(tmpDirectory);

    return path.join(tmpDirectory.name, repoName);
  }

  afterAll(() => {
    tmpDirectories.forEach((tmpDirectory) => {
      //remove project
      tmpDirectory.removeCallback();
    });
  });

  describe('WHEN setting a project with defaults', () => {
    let destination: string;

    beforeAll(async () => {
      destination = createTempDirectory();
      await createModularApp({ name: destination });
    });

    it('should create a project with defaults', () => {
      expect(hashlessTree(destination)).toMatchSnapshot();
    });

    it('Sets up the package.json correctly', async () => {
      expect(
        await readCensoredPackageJson(path.join(destination, 'package.json')),
      ).toMatchSnapshot(`
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
            "dependencies": Object {
              "@testing-library/dom": "?",
              "@testing-library/jest-dom": "?",
              "@testing-library/react": "?",
              "@testing-library/user-event": "?",
              "@types/jest": "?",
              "@types/node": "?",
              "@types/react": "?",
              "@types/react-dom": "?",
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
              "build": "modular build",
              "lint": "modular lint",
              "prettier": "prettier --write .",
              "start": "modular start",
              "test": "modular test",
            },
            "version": "1.0.0",
            "workspaces": Array [
              "packages/**",
            ],
          }
        `);
    });

    it('Sets up an app package.json correctly', async () => {
      expect(
        await readCensoredPackageJson(
          path.join(destination, 'packages', 'app', 'package.json'),
        ),
      ).toMatchSnapshot(`
          Object {
            "author": "?",
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
  });

  describe('WHEN it sets up a project with prefer Offline', () => {
    let destination: string;
    beforeAll(async () => {
      destination = createTempDirectory();
      await createModularApp({
        name: destination,
        preferOffline: true,
      });
    });
    it('should create a project with prefer offline', () => {
      expect(hashlessTree(destination)).toMatchSnapshot();
    });

    it('SHOULD setup an package.json correctly', async () => {
      expect(
        await readCensoredPackageJson(path.join(destination, 'package.json')),
      ).toMatchSnapshot(`
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
          "dependencies": Object {
            "@testing-library/dom": "?",
            "@testing-library/jest-dom": "?",
            "@testing-library/react": "?",
            "@testing-library/user-event": "?",
            "@types/jest": "?",
            "@types/node": "?",
            "@types/react": "?",
            "@types/react-dom": "?",
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
            "build": "modular build",
            "lint": "modular lint",
            "prettier": "prettier --write .",
            "start": "modular start",
            "test": "modular test",
          },
          "version": "1.0.0",
          "workspaces": Array [
            "packages/**",
          ],
        }
      `);
    });

    it('SHOULD setup an app package.json correctly', async () => {
      expect(
        await readCensoredPackageJson(
          path.join(destination, 'packages', 'app', 'package.json'),
        ),
      ).toMatchSnapshot(`
        Object {
          "author": "?",
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
  });

  describe('WHEN it sets up a project without a repo', () => {
    let destination: string;
    beforeAll(async () => {
      destination = createTempDirectory();

      await createModularApp({
        name: destination,
        repo: false,
      });
    });

    it('should create a project without git metadata', () => {
      expect(fs.existsSync(path.join(destination, '.git'))).toBe(false);
    });
  });

  describe('WHEN it sets up a project without a repo and prefer-offline', () => {
    let destination: string;
    beforeAll(async () => {
      destination = createTempDirectory();

      await createModularApp({
        name: destination,
        repo: false,
        preferOffline: true,
      });
    });

    it('SHOULD create a project prefer offline without git metadata', () => {
      expect(fs.existsSync(path.join(destination, '.git'))).toBe(false);
    });
  });
});
