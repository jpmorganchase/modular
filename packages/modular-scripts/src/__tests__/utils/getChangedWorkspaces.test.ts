import { matchWorkspaces } from '../../utils/getChangedWorkspaces';
import type { WorkspaceContent } from '@modular-scripts/modular-types';

describe('matchWorkspaces', () => {
  it('matches absolute manifests paths with holes and duplication to subset of workspace entries', () => {
    const workspacesContent: WorkspaceContent = [
      new Map(
        Object.entries({
          'workspace-1': {
            path: 'w1',
            location: 'w1',
            name: 'workspace-1',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-2': {
            path: 'w2',
            location: '/w2',
            name: 'workspace-3',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-3': {
            path: 'w3',
            location: '/w3',
            name: 'workspace-3',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
        }),
      ),
      {
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
      },
    ];

    const listOfPackageManifests = [
      '/my/path/packages/workspace-1/package.json',
      null,
      '/my/path/packages/workspace-1/package.json',
      '/my/path/packages/workspace-3/package.json',
    ];

    expect(
      matchWorkspaces(listOfPackageManifests, '/my/path', workspacesContent),
    ).toEqual([
      new Map(
        Object.entries({
          'workspace-1': {
            path: 'w1',
            location: 'w1',
            name: 'workspace-1',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-3': {
            path: 'w3',
            location: '/w3',
            name: 'workspace-3',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
        }),
      ),
      {
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
      },
    ]);
  });

  it('does not match paths outside of known workspaces', () => {
    const workspacesContent: WorkspaceContent = [
      new Map(
        Object.entries({
          'workspace-1': {
            path: 'w1',
            location: 'w1',
            name: 'workspace-1',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-2': {
            path: 'w2',
            location: '/w2',
            name: 'workspace-3',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-3': {
            path: 'w3',
            location: '/w3',
            name: 'workspace-3',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
        }),
      ),
      {
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
      },
    ];

    const listOfPackageManifests = [
      '/my/path/packages/workspace-nope/package.json',
    ];

    expect(
      matchWorkspaces(listOfPackageManifests, '/my/path', workspacesContent),
    ).toEqual([new Map([]), {}]);
  });

  it('works with a root workspace', () => {
    const workspacesContent: WorkspaceContent = [
      new Map(
        Object.entries({
          'workspace-root': {
            path: 'w1',
            location: 'w1',
            name: 'workspace-1',
            version: '0.0.1',
            workspace: true,
            modular: {
              type: 'root',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
          'workspace-non-root': {
            path: 'workspace-non-root',
            location: '/workspace-non-root',
            name: 'workspace-non-root',
            version: '0.0.1',
            workspace: false,
            modular: {
              type: 'package',
            },
            children: [],
            parent: null,
            dependencies: undefined,
            rawPackageJson: {},
          },
        }),
      ),
      {
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
      },
    ];

    const listOfPackageManifests = [
      '/my/path/workspace-root/package.json',
      '/my/path/workspace-root/packages/workspace-non-root/package.json',
    ];

    expect(
      matchWorkspaces(
        listOfPackageManifests,
        '/my/path/workspace-root',
        workspacesContent,
      ),
    ).toEqual(workspacesContent);
  });
});
