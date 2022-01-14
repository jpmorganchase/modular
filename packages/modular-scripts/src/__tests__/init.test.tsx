import { initModularFolder } from '../init';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { promisify } from 'util';
import { ModularPackageJson } from '../utils/isModularType';
import { getWorkspaceInfo } from '../utils/getAllWorkspaces';

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

  it('should create a modular folder', async () => {
    expect(fs.existsSync(path.join(folder, 'modular'))).toEqual(true);
    expect(await fs.readdir(path.join(folder, 'modular'))).toEqual([]);
  });

  it('should create a packages folder', async () => {
    expect(fs.existsSync(path.join(folder, 'packages'))).toEqual(true);
    expect(await fs.readdir(path.join(folder, 'packages'))).toEqual([]);
  });

  it('should have an empty yarn.lock', async () => {
    const lockfile = await fs.readFile(path.join(folder, 'yarn.lock'));

    expect(String(lockfile)).toMatchSnapshot();
  });

  it('should not have any workspace info', async () => {
    const workspace = await getWorkspaceInfo(folder, 'yarn');
    expect(workspace).toEqual({});
  });
});
