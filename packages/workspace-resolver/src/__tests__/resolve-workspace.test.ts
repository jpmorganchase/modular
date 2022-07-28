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
      const projectRoot = `${fixturesPath}clean-workspace`;
      const [allPackages] = await resolveWorkspace(
        projectRoot,
        true,
        projectRoot,
      );
      expect(allPackages.has('clean-workspace')).toEqual(true);
      expect(allPackages.has('app-one')).toEqual(true);
      expect(allPackages.has('package-one')).toEqual(true);
      expect(allPackages.has('package-two')).toEqual(true);
    });

    it('does not support nested modular roots', async () => {
      const projectRoot = `${fixturesPath}invalid-workspace-1`;
      let thrown = false;
      let message = '';

      try {
        await resolveWorkspace(projectRoot, true, projectRoot);
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
        await resolveWorkspace(projectRoot, true, projectRoot);
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
        await resolveWorkspace(projectRoot, true, projectRoot);
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
  });

  describe('analyzeWorkspaceDependencies', () => {
    it('correctly identifies workspace dependencies for a clean workspace', async () => {
      const projectRoot = `${fixturesPath}clean-workspace`;
      const [allPackages] = await resolveWorkspace(
        projectRoot,
        true,
        projectRoot,
      );

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
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });

    it('correctly identifies mismatched dependencies', async () => {
      const projectRoot = `${fixturesPath}mismatched-dependency`;
      const [allPackages] = await resolveWorkspace(
        projectRoot,
        true,
        projectRoot,
      );

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
      expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });
  });
});
