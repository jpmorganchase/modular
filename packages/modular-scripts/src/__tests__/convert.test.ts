import { IncludeDefinition as TSConfig } from '@schemastore/tsconfig';
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
      fs.copySync(
        path.join(__dirname, '..', '..', 'types', starterTempType, dir),
        path.join(tmpFolderPath, dir),
        { overwrite: true },
      );
    });
    fs.writeFileSync(
      path.join(tmpFolderPath, 'package.json'),
      JSON.stringify({
        name: tmpProjectName,
      }),
    );
    fs.writeFileSync(
      path.join(tmpFolderPath, 'src', 'setUpTests.js'),
      new Buffer("require('@testing-library/jest-dom/extend-expect')"),
    );
    await initModularFolder(tmpFolderPath, true);
    await convert(tmpFolderPath);
  });

  afterEach(() => {
    tmpFolder.removeCallback();
    tmpFolderPath = '';
    mockedModularRoot.mockClear();
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

  it('should update tsconfig.json', () => {
    const tsConfigFile = fs.readJsonSync(
      path.join(tmpFolderPath, 'tsconfig.json'),
    ) as TSConfig;
    expect(tsConfigFile.include).not.toContain('src');
    expect(tsConfigFile.include).toContain('packages/**/src');
  });

  it('should point react-app-env.d.ts to modular-scripts', () => {
    const reactAppEnvFile = fs
      .readFileSync(
        path.join(
          tmpFolderPath,
          'packages',
          tmpProjectName,
          'src',
          'react-app-env.d.ts',
        ),
      )
      .toString();
    expect(reactAppEnvFile).not.toMatch('<reference types="react-scripts" />');
    expect(reactAppEnvFile).toMatch(
      '<reference types="modular-scripts/react-app-env" />',
    );
  });

  it('should copy setUpTests file to modular with correct extension', () => {
    expect(
      fs
        .readFileSync(path.join(tmpFolderPath, 'modular', 'setUpTests.js'))
        .toString(),
    ).toMatch("require('@testing-library/jest-dom/extend-expect')");
    expect(
      fs.existsSync(
        path.join(
          tmpFolderPath,
          'packages',
          tmpProjectName,
          'src',
          'setUpTests.js',
        ),
      ),
    ).toBe(false);
  });
});
