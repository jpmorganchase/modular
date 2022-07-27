import {
  resolveWorkspace,
  analyzeWorkspaceDependencies,
} from '../resolve-workspace';
import path from 'path';

describe('@modular-scripts/workspace-resolver', () => {
  describe('resolveWorkspace', () => {
    it('resolves a clean workspace, detecting modular packages as appropriate', async () => {
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}clean-workspace`;
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
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}invalid-workspace-1`;
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
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}invalid-workspace-2`;
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
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}invalid-workspace-3`;
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
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}clean-workspace`;
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
      const projectRoot = `${__dirname}${path.sep}__fixtures__${path.sep}mismatched-dependency`;
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
