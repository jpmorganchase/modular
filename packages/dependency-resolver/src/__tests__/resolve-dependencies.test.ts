import { flattenWorkspaceDependencies, LiteWorkSpaceRecord } from '../';

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
      const flattenedDependencies = flattenWorkspaceDependencies(workspaces);
      expect(flattenedDependencies.get('a')).toEqual(new Set(['b', 'c', 'd']));
      expect(flattenedDependencies.get('b')).toEqual(new Set(['d']));
      expect(flattenedDependencies.get('c')).toEqual(new Set(['b', 'd']));
      expect(flattenedDependencies.get('d')).toEqual(new Set());
      expect(flattenedDependencies.get('e')).toEqual(
        new Set(['a', 'b', 'c', 'd']),
      );
    });

    it('flags loops', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b', 'c'] },
        b: { location: '/b', workspaceDependencies: ['d'] },
        c: { location: '/c', workspaceDependencies: undefined },
        d: { location: '/d', workspaceDependencies: ['a'] },
      };
      expect(flattenWorkspaceDependencies(workspaces).get('a')).toEqual(
        new Set(['a', 'b', 'c', 'd']),
      );
    });
  });
});
