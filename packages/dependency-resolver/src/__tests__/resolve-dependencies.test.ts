import {
  generateFlatWorkspaceDependencyForPackage,
  LiteWorkSpaceRecord,
} from '../';

describe('@modular-scripts/dependency-resolver', () => {
  describe('resolveWorkspace', () => {
    it('xxx', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b', 'c'] },
        b: { location: '/b', workspaceDependencies: ['d'] },
        c: { location: '/c', workspaceDependencies: ['b'] },
        d: { location: '/d', workspaceDependencies: undefined },
        e: { location: '/e', workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(
        generateFlatWorkspaceDependencyForPackage(workspaces, 'a'),
      ).toEqual(new Set(['a', 'b', 'c', 'd']));
    });
  });
});
