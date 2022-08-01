import {
  resolveWorkspace,
  analyzeWorkspaceDependencies,
} from '../resolve-workspace';

import path from 'path';

// Find test fixtures (i.e. fake modular workspaces) 4 dirs up, in the root of the project
// This approach avoids putting fake or real packages in the packages dir, which can confuse various tools
const dirsUp = 4;
const traverseUp = Array.from({ length: dirsUp })
  .map(() => `..`)
  .join(path.sep)
  .concat(path.sep);
const fixturesPath = `${__dirname}${path.sep}${traverseUp}__fixtures__${path.sep}`;

describe('@modular-scripts/workspace-resolver', () => {
  describe('resolveWorkspace', () => {
    it('resolves a clean workspace, detecting modular packages as appropriate', async () => {
      const projectRoot = `${fixturesPath}clean-workspace-1`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);
      expect(allPackages.has('clean-workspace-1')).toEqual(true);
      expect(allPackages.has('app-one')).toEqual(true);
      expect(allPackages.has('package-one')).toEqual(true);
      expect(allPackages.has('package-two')).toEqual(true);
    });

    // This covers the alternative object workspaces syntax that yarn supports
    // See https://classic.yarnpkg.com/blog/2018/02/15/nohoist/
    it('resolves a clean workspace (using object workspaces syntax)', async () => {
      const projectRoot = `${fixturesPath}clean-workspace-2`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);
      expect(allPackages.has('clean-workspace-2')).toEqual(true);
      expect(allPackages.has('app-one')).toEqual(true);
      expect(allPackages.has('package-one')).toEqual(true);
      expect(allPackages.has('package-two')).toEqual(true);
    });

    it('resolves a clean workspace (using workspace ranges)', async () => {
      const projectRoot = `${fixturesPath}clean-workspace-3`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);
      expect(allPackages.has('clean-workspace-3')).toEqual(true);
      expect(allPackages.has('app-one')).toEqual(true);
      expect(allPackages.has('package-one')).toEqual(true);
      expect(allPackages.has('package-two')).toEqual(true);
      expect(allPackages.has('package-three')).toEqual(true);
      expect(allPackages.has('package-four')).toEqual(true);
    });

    it('does not support nested modular roots', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-1`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, projectRoot);
      } catch (err) {
        thrown = true;
        if (err instanceof Error) {
          message = err.message;
        }
      }

      expect(thrown).toEqual(true);
      expect(message).toEqual(
        'Nested modular roots are currently not supported by Modular',
      );
    });

    it('does not support nested yarn workspaces (implementation 1)', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-2`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, projectRoot);
      } catch (err) {
        thrown = true;
        if (err instanceof Error) {
          message = err.message;
        }
      }

      expect(thrown).toEqual(true);
      expect(message).toEqual(
        'Nested workspaces are currently not supported by Modular',
      );
    });

    it('does not support nested yarn workspaces (implementation 2)', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-3`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, projectRoot);
      } catch (err) {
        thrown = true;
        if (err instanceof Error) {
          message = err.message;
        }
      }

      expect(thrown).toEqual(true);
      expect(message).toEqual(
        'Nested workspaces are currently not supported by Modular',
      );
    });

    it('does not support packages with no name', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-4`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, projectRoot);
      } catch (err) {
        thrown = true;
        if (err instanceof Error) {
          message = err.message;
        }
      }

      expect(thrown).toEqual(true);
      expect(message).toEqual(
        'The package at packages/app-one/package.json does not have a valid name. Modular requires workspace packages to have a name.',
      );
    });

    it('does not support packages with no version', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-5`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, projectRoot);
      } catch (err) {
        thrown = true;
        if (err instanceof Error) {
          message = err.message;
        }
      }

      expect(thrown).toEqual(true);
      expect(message).toEqual(
        'The package "app-one" has an invalid version. Modular requires workspace packages to have a version.',
      );
    });
  });

  describe('analyzeWorkspaceDependencies', () => {
    it('correctly identifies workspace dependencies for a clean workspace', async () => {
      const projectRoot = `${fixturesPath}clean-workspace-1`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);

      const result = analyzeWorkspaceDependencies(allPackages);
      const expected = {
        'app-one': {
          location: 'packages/app-one',
          workspaceDependencies: ['package-one', 'package-two'],
          mismatchedWorkspaceDependencies: [],
        },
        'package-one': {
          location: 'packages/package-one',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
        'package-two': {
          location: 'packages/package-two',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
      };
      expect(result).toEqual(expected);
    });

    it('correctly identifies mismatched dependencies', async () => {
      const projectRoot = `${fixturesPath}mismatched-dependency`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);

      const result = analyzeWorkspaceDependencies(allPackages);
      const expected = {
        'app-one': {
          location: 'packages/app-one',
          workspaceDependencies: ['package-two'],
          mismatchedWorkspaceDependencies: ['package-one'],
        },
        'package-one': {
          location: 'packages/package-one',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
        'package-two': {
          location: 'packages/package-two',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
      };
      expect(result).toEqual(expected);
    });

    it('correctly identifies dependencies (workspace range)', async () => {
      const projectRoot = `${fixturesPath}clean-workspace-3`;
      const [allPackages] = await resolveWorkspace(projectRoot, projectRoot);

      // Matches explanation (version 1.0.0):
      // Range of '*': matches
      // Range of '^1.0.0': matches
      // Range of '^': mismatches
      // Range of '~': mismatches
      // We rely on semver to determine this, the same way that yarn do.

      const result = analyzeWorkspaceDependencies(allPackages);
      const expected = {
        'app-one': {
          location: 'packages/app-one',
          workspaceDependencies: ['package-one', 'package-four'],
          mismatchedWorkspaceDependencies: ['package-two', 'package-three'],
        },
        'package-one': {
          location: 'packages/package-one',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
        'package-two': {
          location: 'packages/package-two',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
        'package-three': {
          location: 'packages/package-three',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
        'package-four': {
          location: 'packages/package-four',
          workspaceDependencies: [],
          mismatchedWorkspaceDependencies: [],
        },
      };
      expect(result).toEqual(expected);
    });
  });
});
