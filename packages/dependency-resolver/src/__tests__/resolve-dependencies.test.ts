import {
  generateFlatWorkspaceDependencyForPackage,
  LiteWorkSpaceRecord,
} from '../';

describe('@modular-scripts/dependency-resolver', () => {
  describe('flatten dependencies', () => {
    it('flattens dependencies', () => {
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

    it('flags loops', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b', 'c'] },
        b: { location: '/b', workspaceDependencies: ['d'] },
        c: { location: '/c', workspaceDependencies: undefined },
        d: { location: '/d', workspaceDependencies: ['a'] },
      };
      expect(
        generateFlatWorkspaceDependencyForPackage(workspaces, 'a'),
      ).toEqual(new Set(['a', 'b', 'c', 'd']));
    });
  });
});
