import { initModularFolder } from '../init';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { promisify } from 'util';
import { ModularPackageJson } from '../../utils/isModularType';

const mktempd = promisify(tmp.dir);

describe('Creating a new modular folder', () => {
  let folder: string;
  beforeEach(async () => {
    folder = await mktempd();
  });

  afterEach(async () => {
    await fs.remove(folder);
  });

  it('should make a new repo with the right name', async () => {
    await initModularFolder(folder, true);

    const packageJson = (await fs.readJSON(
      path.join(folder, 'package.json'),
    )) as ModularPackageJson;
    expect(packageJson).toMatchSnapshot();
  });
});
