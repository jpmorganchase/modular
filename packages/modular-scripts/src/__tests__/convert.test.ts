import { IncludeDefinition as TSConfig } from '@schemastore/tsconfig';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';

import { ModularPackageJson } from '../utils/isModularType';
import * as getModularRoot from '../utils/getModularRoot';
import { convert } from '../convert';

jest.mock('../utils/getModularRoot');

const mockedModularRoot = getModularRoot.default as jest.MockedFunction<
  typeof getModularRoot.default
>;

describe('Converting a react app to modular app', () => {
  let tmpFolder: tmp.DirResult;
  let tmpFolderPath: string;
  const starterTempType = 'app';
  const tmpProjectName = 'test-modular-convert';
  const rootPackageJson: ModularPackageJson = {
    name: tmpProjectName,
    browserslist: {
      production: ['>0.2%', 'not dead', 'not op_mini all'],
      development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
      ],
    },
    dependencies: {
      'react-scripts': '4.0.3',
    },
  };

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
    fs.writeJSONSync(
      path.join(tmpFolderPath, 'package.json'),
      rootPackageJson,
      { spaces: 2 },
    );
    fs.writeFileSync(
      path.join(tmpFolderPath, 'src', 'setupTests.ts'),
      Buffer.from("import '@testing-library/jest-dom/extend-expect';"),
    );
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

  it('should copy setupTests file to modular with correct extension', () => {
    expect(
      fs
        .readFileSync(path.join(tmpFolderPath, 'modular', 'setupTests.ts'))
        .toString(),
    ).toMatch("import '@testing-library/jest-dom/extend-expect';");
    expect(
      fs.existsSync(
        path.join(
          tmpFolderPath,
          'packages',
          tmpProjectName,
          'src',
          'setupTests.ts',
        ),
      ),
    ).toBe(false);
  });
  it('should remove react-scripts from the dependencies', () => {
    const updatedPackageJson = fs.readJsonSync(
      path.join(tmpFolderPath, 'package.json'),
    ) as ModularPackageJson;
    expect(Object.keys(updatedPackageJson.dependencies || {})).not.toContain(
      'react-scripts',
    );
  });

  it('should copy over root browserslist into app package.json', () => {
    const newPackageJson = fs.readJsonSync(
      path.join(tmpFolderPath, 'packages', tmpProjectName, 'package.json'),
    ) as ModularPackageJson;
    expect(newPackageJson.browserslist).toMatchObject(
      rootPackageJson.browserslist as Record<string, string[]>,
    );
  });

  it('should add eslint-config-modular-app to the dependencies', () => {
    const updatedPackageJson = fs.readJsonSync(
      path.join(tmpFolderPath, 'package.json'),
    ) as ModularPackageJson;
    expect(Object.keys(updatedPackageJson.dependencies || {})).toContain(
      'eslint-config-modular-app',
    );
  });
});
