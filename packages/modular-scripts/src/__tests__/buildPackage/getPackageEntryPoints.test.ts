import { getMain } from '../../build/buildPackage/getPackageEntryPoints';

jest.mock('../../utils/getModularRoot', () => {
  return {
    __esModule: true,
    default() {
      return __dirname;
    },
  };
});

jest.mock('fs-extra', () => {
  return {
    __esModule: true,
    existsSync() {
      return true;
    },
  };
});

const packagePath = 'modular-scripts';

describe('WHEN given a package.json which doesnt exist', () => {
  it('SHOULD give an error', () => {
    expect(() => getMain(packagePath, true, undefined)).toThrow(
      `no package.json in ${packagePath}, bailing...`,
    );
  });
});

describe('WHEN given a package.json which is private', () => {
  it('SHOULD give the main if includePrivate is true', () => {
    expect(
      getMain(packagePath, true, {
        private: true,
        main: 'src/index.ts',
        name: packagePath,
        version: '1.0.0',
      }),
    ).toBe('src/index.ts');
  });

  it('SHOULD give an error if the includePrivate flag is false', () => {
    expect(() =>
      getMain(packagePath, false, {
        private: true,
        main: 'src/index.ts',
        name: packagePath,
        version: '1.0.0',
      }),
    ).toThrow(`${packagePath} is marked private, bailing...`);
  });
});

describe('WHEN given a package.json without a name', () => {
  it('SHOULD give an error', () => {
    expect(() => getMain(packagePath, true, {})).toThrow(
      `package.json does not have a valid "name", bailing...`,
    );
  });
});

describe('WHEN given a package.json without a version', () => {
  it('SHOULD give an error', () => {
    expect(() =>
      getMain(packagePath, true, {
        name: packagePath,
      }),
    ).toThrow(`package.json does not have a valid "version", bailing...`);
  });
});

describe('WHEN given a package.json with a module', () => {
  it('SHOULD give an error', () => {
    expect(() =>
      getMain(packagePath, true, {
        name: packagePath,
        version: '1.0.0',
        main: 'src/index.ts',
        module: 'src/index.ts',
      }),
    ).toThrow(`package.json shouldn't have a "module" field, bailing...`);
  });
});

describe('WHEN given a package.json with a typings', () => {
  it('SHOULD give an error', () => {
    expect(() =>
      getMain(packagePath, true, {
        name: packagePath,
        version: '1.0.0',
        main: 'src/index.ts',
        typings: 'src/index.d.ts',
      }),
    ).toThrow(`package.json shouldn't have a "typings" field, bailing...`);
  });
});

describe('WHEN given a package.json without a main', () => {
  it('SHOULD give an error', () => {
    expect(() =>
      getMain(packagePath, true, {
        name: packagePath,
        version: '1.0.0',
      }),
    ).toThrow(
      `package.json at ${packagePath} does not have a "main" field, bailing...`,
    );
  });
});
