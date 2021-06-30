import { initModularFolder } from '../init';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { promisify } from 'util';
import { ModularPackageJson } from '../utils/isModularType';
import { getYarnWorkspaceInfo } from '../utils/getAllWorkspaces';

const mktempd = promisify(tmp.dir);

describe('Creating a new modular folder', () => {
  let folder: string;
  beforeEach(async () => {
    folder = await mktempd();
    await initModularFolder(folder, true);
  });

  afterEach(async () => {
    await fs.remove(folder);
  });

  it('should make a new repo with the right name and properties', async () => {
    const packageJson = (await fs.readJSON(
      path.join(folder, 'package.json'),
    )) as ModularPackageJson;

    packageJson.name = 'test-modular-app';

    expect(packageJson).toMatchSnapshot();
  });

  it('should copy over the modular root template files if they are not already present', async () => {
    const rootFiles = await fs.readdir(
      path.join(__dirname, '..', '..', 'types', 'root'),
    );
    rootFiles.forEach((name) => {
      expect(fs.existsSync(path.join(folder, name))).toBe(true);
    });
  });

  it('should have an empty yarn.lock', async () => {
    const lockfile = await fs.readFile(path.join(folder, 'yarn.lock'));

    expect(String(lockfile)).toMatchSnapshot();
  });

  it('should not have any workspace info', () => {
    const workspace = getYarnWorkspaceInfo(folder);
    expect(workspace).toEqual({});
  });
});
