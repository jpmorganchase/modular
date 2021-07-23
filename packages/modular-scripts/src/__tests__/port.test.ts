import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import rimraf from 'rimraf';

import { ModularPackageJson } from '../utils/isModularType';
import * as getModularRoot from '../utils/getModularRoot';
import { port } from '../port';
import { initModularFolder } from '../init';

jest.mock('../utils/getModularRoot');

const mockedModularRoot = getModularRoot.default as jest.MockedFunction<
  typeof getModularRoot.default
>;

let tmpApp: tmp.DirResult;
let tmpAppPath: string;
let tmpRoot: tmp.DirResult;
let tmpRootPath: string;
const tmpProjectName = 'test-modular-port';
const tmpModularRootName = 'modular-root';

async function setupTempModularRoot() {
  tmpRoot = tmp.dirSync({ unsafeCleanup: true });
  tmpRootPath = path.join(tmpRoot.name, tmpModularRootName);
  await fs.mkdirp(tmpRootPath);
  await initModularFolder(tmpRootPath, true);
  mockedModularRoot.mockImplementation(() => tmpRootPath);
}

const starterTempType = 'app';
const appPackageJson: ModularPackageJson = {
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
    lodash: '^4.17.20',
  },
  devDependencies: {
    'monaco-editor-webpack-plugin': '^3.0.1',
  },
};

async function setUpTempApp() {
  tmpApp = tmp.dirSync({ unsafeCleanup: true });
  tmpAppPath = path.join(tmpApp.name, tmpProjectName);
  await fs.mkdir(tmpAppPath);
  const starterFolder = ['src', 'public'];
  starterFolder.forEach((dir) => {
    fs.copySync(
      path.join(__dirname, '..', '..', 'types', starterTempType, dir),
      path.join(tmpAppPath, dir),
      { overwrite: true },
    );
  });
  fs.writeJSONSync(path.join(tmpAppPath, 'package.json'), appPackageJson, {
    spaces: 2,
  });
  fs.writeFileSync(
    path.join(tmpAppPath, 'src', 'setupTests.ts'),
    Buffer.from("import '@testing-library/jest-dom/extend-expect';"),
  );
}

describe('Porting a react app into a modular project', () => {
  beforeEach(async () => {
    await setupTempModularRoot();
    await setUpTempApp();
  });

  afterEach(() => {
    tmpApp.removeCallback();
    tmpAppPath = '';
    tmpRoot.removeCallback();
    tmpRootPath = '';
    mockedModularRoot.mockClear();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should port a react app over as a modular app in packages workspace', async () => {
    await port(path.relative(tmpRootPath, tmpAppPath));
    expect(
      fs.existsSync(path.join(tmpRootPath, 'packages', tmpProjectName)),
    ).toBe(true);

    const packageJson = fs.readJSONSync(
      path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
    ) as ModularPackageJson;

    expect(packageJson?.modular?.type).toBe('app');
  });

  it('should update react-app-env.d.ts to modular-scripts', async () => {
    await port(path.relative(tmpRootPath, tmpAppPath));
    const reactAppEnvFile = fs
      .readFileSync(
        path.join(
          tmpRootPath,
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

  describe('when there is already a setupTests file in modular folder', () => {
    it('should not copy over the setupTests file', async () => {
      fs.writeFileSync(
        path.join(tmpRootPath, 'modular', 'setupTests.ts'),
        Buffer.from('Testing setupTests file'),
      );
      await port(path.relative(tmpRootPath, tmpAppPath));
      expect(
        fs
          .readFileSync(path.join(tmpRootPath, 'modular', 'setupTests.ts'))
          .toString(),
      ).toMatch('Testing setupTests file');
    });
  });

  describe('when there is not a setupTests file in modular', () => {
    it('should copy over the setupTest file', async () => {
      rimraf.sync(path.join(tmpRootPath, 'modular'));
      await port(path.relative(tmpRootPath, tmpAppPath));
      expect(
        fs
          .readFileSync(path.join(tmpRootPath, 'modular', 'setupTests.ts'))
          .toString(),
      ).toMatch("import '@testing-library/jest-dom/extend-expect';");
    });
  });

  it('should copy over root browserslist into app package.json', async () => {
    await port(path.relative(tmpRootPath, tmpAppPath));
    const newPackageJson = fs.readJsonSync(
      path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
    ) as ModularPackageJson;
    expect(newPackageJson.browserslist).toMatchObject(
      appPackageJson.browserslist as Record<string, string[]>,
    );
  });

  it('should remove react-scripts from the dependencies', async () => {
    await port(path.relative(tmpRootPath, tmpAppPath));
    const newPackageJson = fs.readJsonSync(
      path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
    ) as ModularPackageJson;
    expect(Object.keys(newPackageJson.dependencies || {})).not.toContain(
      'react-scripts',
    );
  });

  describe('when modular root does not have the targeted app dependency', () => {
    it('should add it to the new app package.json', async () => {
      await port(path.relative(tmpRootPath, tmpAppPath));
      const newPackageJson = fs.readJsonSync(
        path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
      ) as ModularPackageJson;
      expect(Object.keys(newPackageJson.dependencies || {})).toContain(
        'lodash',
      );
    });
  });
  describe('when modular root has the targeted app dependency', () => {
    it('should not add it to the new app package.json', async () => {
      fs.writeJsonSync(
        path.join(tmpRootPath, 'package.json'),
        {
          ...fs.readJsonSync(path.join(tmpRootPath, 'package.json')),
          dependencies: {
            lodash: '^4.17.20',
          },
        },
        { spaces: 2 },
      );
      await port(path.relative(tmpRootPath, tmpAppPath));
      const newPackageJson = fs.readJsonSync(
        path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
      ) as ModularPackageJson;
      expect(Object.keys(newPackageJson.dependencies || {})).not.toContain(
        'lodash',
      );
    });
  });

  describe('when modular root does not have the targeted app dev dependency', () => {
    it('should add it to the new app package.json', async () => {
      await port(path.relative(tmpRootPath, tmpAppPath));
      const newPackageJson = fs.readJsonSync(
        path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
      ) as ModularPackageJson;
      expect(Object.keys(newPackageJson.devDependencies || {})).toContain(
        'monaco-editor-webpack-plugin',
      );
    });
  });
  describe('when modular root has the targeted app dev dependency', () => {
    it('should not add it to the new app package.json', async () => {
      fs.writeJsonSync(
        path.join(tmpRootPath, 'package.json'),
        {
          ...fs.readJsonSync(path.join(tmpRootPath, 'package.json')),
          devDependencies: {
            'monaco-editor-webpack-plugin': '^3.0.1',
          },
        },
        { spaces: 2 },
      );
      await port(path.relative(tmpRootPath, tmpAppPath));
      const newPackageJson = fs.readJsonSync(
        path.join(tmpRootPath, 'packages', tmpProjectName, 'package.json'),
      ) as ModularPackageJson;
      expect(Object.keys(newPackageJson.devDependencies || {})).not.toContain(
        'monaco-editor-webpack-plugin',
      );
    });
  });
});
