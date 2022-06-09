import {
  parseYarnLock,
  resolvePackageDependencies,
} from '../../utils/getPackageDependencies';

describe('Resolve dependencies', () => {
  it('should resolve dependencies', () => {
    const { manifest, resolutions, manifestMiss, lockFileMiss } =
      resolvePackageDependencies({
        dependenciesfromSource: ['dependency-1', 'dependency-2'],
        packageDeps: {
          'dependency-1': '^1.1.2',
          'dependency-2': '^2.3.4',
          'dependency-3': '>4.5.6',
        },
        lockDeps: {
          'dependency-1': '1.1.8',
          'dependency-2': '2.4.0',
          'dependency-3': '4.9.8',
        },
        workspaceInfo: {
          'other-dependency': {
            location: '',
            version: '3.0.0',
            workspaceDependencies: [],
            mismatchedWorkspaceDependencies: [],
            type: 'esm-view',
            public: false,
          },
        },
      });
    expect(manifest).toEqual({
      'dependency-1': '^1.1.2',
      'dependency-2': '^2.3.4',
    });
    expect(resolutions).toEqual({
      'dependency-1': '1.1.8',
      'dependency-2': '2.4.0',
    });
    expect(lockFileMiss).toEqual([]);
    expect(manifestMiss).toEqual([]);
  });

  it('should resolve dependencies with pacxkage and lockfile misses', () => {
    const { manifest, resolutions, manifestMiss, lockFileMiss } =
      resolvePackageDependencies({
        dependenciesfromSource: [
          'dependency-1',
          'dependency-2',
          'dependency-missing',
        ],
        packageDeps: {
          'dependency-1': '^1.1.2',
          'dependency-2': '^2.3.4',
          'dependency-3': '>4.5.6',
        },
        lockDeps: {
          'dependency-1': '1.1.8',
          'dependency-2': '2.4.0',
          'dependency-3': '4.9.8',
        },
        workspaceInfo: {
          'other-dependency': {
            location: '',
            version: '3.0.0',
            workspaceDependencies: [],
            mismatchedWorkspaceDependencies: [],
            type: 'esm-view',
            public: false,
          },
        },
      });
    expect(manifest).toEqual({
      'dependency-1': '^1.1.2',
      'dependency-2': '^2.3.4',
    });
    expect(resolutions).toEqual({
      'dependency-1': '1.1.8',
      'dependency-2': '2.4.0',
    });
    expect(lockFileMiss).toEqual(['dependency-missing']);
    expect(manifestMiss).toEqual(['dependency-missing']);
  });
});

describe('Parse yarn lockfiles', () => {
  it('should parse correctly a Yarn v3 (yaml) lockfile either', () => {
    const yarnV3Contents = `
__metadata:
  version: 5
  cacheKey: 8

"yaml@npm:^1.10.0, yaml@npm:^1.10.2, yaml@npm:^1.7.2":
  version: 1.10.2
  resolution: "yaml@npm:1.10.2"
  checksum: ce4ada136e8a78a0b08dc10b4b900936912d15de59905b2bf415b4d33c63df1d555d23acb2a41b23cf9fb5da41c256441afca3d6509de7247daa062fd2c5ea5f
  languageName: node
  linkType: hard

"yargs-parser@npm:20.x, yargs-parser@npm:^20.2.2, yargs-parser@npm:^20.2.9":
  version: 20.2.9
  resolution: "yargs-parser@npm:20.2.9"
  checksum: 8bb69015f2b0ff9e17b2c8e6bfe224ab463dd00ca211eece72a4cd8a906224d2703fb8a326d36fdd0e68701e201b2a60ed7cf81ce0fd9b3799f9fe7745977ae3
  languageName: node
  linkType: hard

"yargs-parser@npm:^13.1.2":
  version: 13.1.2
  resolution: "yargs-parser@npm:13.1.2"
  dependencies:
    camelcase: ^5.0.0
    decamelize: ^1.2.0
  checksum: c8bb6f44d39a4acd94462e96d4e85469df865de6f4326e0ab1ac23ae4a835e5dd2ddfe588317ebf80c3a7e37e741bd5cb0dc8d92bcc5812baefb7df7c885e86b
  languageName: node
  linkType: hard
`;

    const deps = {
      yaml: '^1.7.2',
      'yargs-parser': '^20.2.2',
      'not-existing': '7.7.7',
    };

    const resolutions = parseYarnLock(yarnV3Contents, deps);
    expect(resolutions).toEqual({
      yaml: '1.10.2',
      'yargs-parser': '20.2.9',
    });
  });

  it('should parse correctly a Yarn v1 lockfile', () => {
    const yarnV1Contents = `
yaml@^1.10.0, yaml@^1.10.2, yaml@^1.7.2:
  version "1.10.2"
  resolved "https://registry.yarnpkg.com/yaml/-/yaml-1.10.2.tgz#2301c5ffbf12b467de8da2333a459e29e7920e4b"
  integrity sha512-r3vXyErRCYJ7wg28yvBY5VSoAF8ZvlcW9/BwUzEtUsjvX/DKs24dIkuwjtuprwJJHsbyUbLApepYTR1BN4uHrg==

yargs-parser@20.x:
  version "20.2.9"
  resolved "https://registry.yarnpkg.com/yargs-parser/-/yargs-parser-20.2.9.tgz#2eb7dc3b0289718fc295f362753845c41a0c94ee"
  integrity sha512-y11nGElTIV+CT3Zv9t7VKl+Q3hTQoT9a1Qzezhhl6Rp21gJ/IVTW7Z3y9EWXhuUBC2Shnf+DX0antecpAwSP8w==

yargs-parser@^18.1.2, yargs-parser@^18.1.3:
  version "18.1.3"
  resolved "https://registry.yarnpkg.com/yargs-parser/-/yargs-parser-18.1.3.tgz#be68c4975c6b2abf469236b0c870362fab09a7b0"
  integrity sha512-o50j0JeToy/4K6OZcaQmW6lyXXKhq7csREXcDwk2omFPJEwUNOVtJKvmDr9EI1fAJZUyZcRF7kxGBWmRXudrCQ==
  dependencies:
    camelcase "^5.0.0"
    decamelize "^1.2.0"
`;

    const deps = {
      yaml: '^1.7.2',
      'yargs-parser': '20.x',
      'not-existing': '7.7.7',
    };

    const resolutions = parseYarnLock(yarnV1Contents, deps);
    expect(resolutions).toEqual({
      yaml: '1.10.2',
      'yargs-parser': '20.2.9',
    });
  });
});
