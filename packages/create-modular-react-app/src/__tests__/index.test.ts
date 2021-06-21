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
  describe.each([true, false])(
    'with --prefer-offline %s',
    (preferOffline: boolean) => {
      it('should create a project', async () => {
        await createModularApp({ name: destination, preferOffline });
        expect(tree(destination)).toMatchSnapshot();
        expect(
          await readCensoredPackageJson(path.join(destination, 'package.json')),
        ).toMatchSnapshot();
        expect(
          await readCensoredPackageJson(
            path.join(destination, 'packages', 'app', 'package.json'),
          ),
        ).toMatchSnapshot();
      });

      it('should create a project without git metadata', async () => {
        await createModularApp({
          name: destination,
          repo: false,
          preferOffline,
        });
        expect(fs.existsSync(path.join(destination, '.git'))).toEqual(false);
      });
    },
  );
});
