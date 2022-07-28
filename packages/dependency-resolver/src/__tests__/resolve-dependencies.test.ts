import { walkWorkspaceDependencies, LiteWorkSpaceRecord } from '../';

describe('@modular-scripts/dependency-resolver', () => {
  describe('resolve dependencies', () => {
    it('resolves descendants in order', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b', 'c'] },
        b: { location: '/b', workspaceDependencies: ['d'] },
        c: { location: '/c', workspaceDependencies: ['b'] },
        d: { location: '/d', workspaceDependencies: undefined },
        e: { location: '/e', workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(walkWorkspaceDependencies(workspaces, 'a')).toEqual(
        new Map([
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(walkWorkspaceDependencies(workspaces, 'b')).toEqual(
        new Map([['d', 1]]),
      );
      expect(walkWorkspaceDependencies(workspaces, 'c')).toEqual(
        new Map([
          ['b', 1],
          ['d', 2],
        ]),
      );
      expect(walkWorkspaceDependencies(workspaces, 'd')).toEqual(new Map());
      expect(walkWorkspaceDependencies(workspaces, 'e')).toEqual(
        new Map([
          ['a', 1],
          ['b', 3],
          ['c', 2],
          ['d', 4],
        ]),
      );
    });

    it('throws on cycles going back to the first dependency', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b', 'c'] },
        b: { location: '/b', workspaceDependencies: ['d'] },
        c: { location: '/c', workspaceDependencies: undefined },
        d: { location: '/d', workspaceDependencies: ['a'] },
      };
      expect(() => walkWorkspaceDependencies(workspaces, 'a')).toThrow();
    });

    it('throws on cycles in later descendants', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { location: '/a', workspaceDependencies: ['b'] },
        b: { location: '/b', workspaceDependencies: ['c'] },
        c: { location: '/c', workspaceDependencies: ['b'] },
      };
      expect(() => walkWorkspaceDependencies(workspaces, 'a')).toThrow();
    });
  });
});
