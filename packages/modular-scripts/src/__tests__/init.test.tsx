import { initModularFolder } from '../init';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { promisify } from 'util';
import { getWorkspacePackages } from '../utils/getAllWorkspaces';

import type { ModularPackageJson } from '@modular-scripts/modular-types';

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

  it('should contain 1 workspace (the root) and an empty dependency analysis', async () => {
    const workspace = await getWorkspacePackages(folder, folder);

    // 1 item in the workspace output (the root package)
    expect(workspace[0].size).toEqual(1);
    const item = Array.from(workspace[0])[0][1];
    expect(item.version).toEqual('1.0.0');
    expect(item.workspace).toEqual(true);

    // Empty dependency analysis
    expect(workspace[1]).toEqual({});
  });
});
