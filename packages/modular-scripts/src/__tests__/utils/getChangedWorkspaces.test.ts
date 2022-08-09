import { matchWorkspaces } from '../../utils/getChangedWorkspaces';

describe('matchWorkspaces', () => {
  it('matches absolute manifests paths with holes and duplication to subset of workspace entries', () => {
    const workspaces = {
      'workspace-1': {
        location: 'packages/workspace-1',
        workspaceDependencies: ['workspace-2', 'workspace-3'],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-2': {
        location: 'packages/workspace-2',
        workspaceDependencies: ['workspace-3'],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-3': {
        location: 'packages/workspace-3',
        workspaceDependencies: [],
        mismatchedWorkspaceDependencies: [],
      },
    };

    const listOfPackageManifests = [
      '/my/path/packages/workspace-1/package.json',
      null,
      '/my/path/packages/workspace-1/package.json',
      '/my/path/packages/workspace-3/package.json',
    ];

    expect(
      matchWorkspaces(listOfPackageManifests, '/my/path', workspaces),
    ).toEqual({
      'workspace-1': {
        location: 'packages/workspace-1',
        workspaceDependencies: ['workspace-2', 'workspace-3'],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-3': {
        location: 'packages/workspace-3',
        workspaceDependencies: [],
        mismatchedWorkspaceDependencies: [],
      },
    });
  });

  it('does not match paths outside of known workspaces', () => {
    const workspaces = {
      'workspace-1': {
        location: 'packages/workspace-1',
        workspaceDependencies: ['workspace-2', 'workspace-3'],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-2': {
        location: 'packages/workspace-2',
        workspaceDependencies: ['workspace-3'],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-3': {
        location: 'packages/workspace-3',
        workspaceDependencies: [],
        mismatchedWorkspaceDependencies: [],
      },
    };

    const listOfPackageManifests = [
      '/my/path/packages/workspace-nope/package.json',
    ];

    expect(
      matchWorkspaces(listOfPackageManifests, '/my/path', workspaces),
    ).toEqual({});
  });

  it('works with a root workspace', () => {
    const workspaces = {
      'workspace-root': {
        location: '',
        workspaceDependencies: [],
        mismatchedWorkspaceDependencies: [],
      },
      'workspace-non-root': {
        location: 'packages/workspace-non-root',
        workspaceDependencies: [],
        mismatchedWorkspaceDependencies: [],
      },
    };

    const listOfPackageManifests = [
      '/my/path/workspace-root/package.json',
      '/my/path/workspace-root/packages/workspace-non-root/package.json',
    ];

    expect(
      matchWorkspaces(
        listOfPackageManifests,
        '/my/path/workspace-root',
        workspaces,
      ),
    ).toEqual(workspaces);
  });
});
