import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import { ModularPackageJson } from '../utils/isModularType';
import { initModularFolder } from '../init';
import { convert } from '../convert';
import * as getModularRoot from '../utils/getModularRoot';

jest.mock('../utils/getModularRoot');

const mockedModularRoot = getModularRoot.default as jest.MockedFunction<
  typeof getModularRoot.default
>;

describe('Converting a react app to modular app', () => {
  let tmpFolder: tmp.DirResult;
  let tmpFolderPath: string;
  const starterTempType = 'app-view';
  const tmpProjectName = 'test-modular-convert';
  beforeEach(async () => {
    tmpFolder = tmp.dirSync({ unsafeCleanup: true });
    tmpFolderPath = path.join(tmpFolder.name, tmpProjectName);
    await fs.mkdir(tmpFolderPath);
    mockedModularRoot.mockImplementation(() => tmpFolderPath);
    const starterFolder = ['src', 'public'];
    starterFolder.forEach((dir) => {
      fs.mkdirSync(path.join(tmpFolderPath, dir));
      fs.copySync(
        path.join(__dirname, '..', '..', 'types', starterTempType, dir),
        path.join(tmpFolderPath, dir),
      );
    });
    await initModularFolder(tmpFolderPath, true);
    await convert(tmpFolderPath);
  });

  afterEach(() => {
    tmpFolder.removeCallback();
    tmpFolderPath = '';
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should create a modular app with the name of the current directory', () => {
    const packageJson = fs.readJSONSync(
      path.join(tmpFolderPath, 'packages', tmpProjectName, 'package.json'),
    ) as ModularPackageJson;

    expect(packageJson?.modular?.type).toBe('app');
    expect(
      fs.existsSync(path.join(tmpFolderPath, 'packages', tmpProjectName)),
    ).toBe(true);
  });

  it('should move the starting src folder into the modular app src folder', () => {
    expect(
      fs.readdirSync(
        path.join(tmpFolderPath, 'packages', tmpProjectName, 'src'),
      ),
    ).toEqual(
      fs.readdirSync(
        path.join(__dirname, '..', '..', 'types', starterTempType, 'src'),
      ),
    );
  });

  it('should move the starting public folder into the modular app public folder', () => {
    expect(
      fs.readdirSync(
        path.join(tmpFolderPath, 'packages', tmpProjectName, 'public'),
      ),
    ).toEqual(
      fs.readdirSync(
        path.join(__dirname, '..', '..', 'types', starterTempType, 'public'),
      ),
    );
  });
});
