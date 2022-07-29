import {
  walkWorkspaceRelations,
  computeAncestorFromDescendants,
  LiteWorkSpaceRecord,
} from '..';

describe('@modular-scripts/dependency-resolver', () => {
  describe('computeAncestorFromDescendants', () => {
    it('inverts descendants to ancestors', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: undefined },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };

      expect(computeAncestorFromDescendants(workspaces)).toEqual({
        a: { workspaceAncestors: ['e'] },
        b: { workspaceAncestors: ['a', 'c', 'e'] },
        c: { workspaceAncestors: ['a', 'e'] },
        d: { workspaceAncestors: ['b'] },
      });
    });
  });
  describe('walkWorkspaceRelations', () => {
    it('resolves descendants in order', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: undefined },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(walkWorkspaceRelations(workspaces, 'a')).toEqual(
        new Map([
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(walkWorkspaceRelations(workspaces, 'b')).toEqual(
        new Map([['d', 1]]),
      );
      expect(walkWorkspaceRelations(workspaces, 'c')).toEqual(
        new Map([
          ['b', 1],
          ['d', 2],
        ]),
      );
      expect(walkWorkspaceRelations(workspaces, 'd')).toEqual(new Map());
      expect(walkWorkspaceRelations(workspaces, 'e')).toEqual(
        new Map([
          ['a', 1],
          ['b', 3],
          ['c', 2],
          ['d', 4],
        ]),
      );
    });

    it('resolves descendants in some (unreliable) order with a cycle going back to the first dependency', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: undefined },
        d: { workspaceDependencies: ['a'] },
        e: { workspaceDependencies: ['d'] },
      };
      const dependencyMap = walkWorkspaceRelations(workspaces, 'a', false);
      expect(dependencyMap.has('a')).toBe(true); // The original dependency is there, because it's inside the cycle
      expect(dependencyMap.has('b')).toBe(true);
      expect(dependencyMap.has('c')).toBe(true);
      expect(dependencyMap.has('e')).toBe(false);
    });

    it('resolves descendants in some (unreliable) order with a cycle not going back to the first dependency', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      const dependencyMap = walkWorkspaceRelations(workspaces, 'a', false);
      expect(dependencyMap.has('a')).toBe(false); // The original dependency is not there, because it's outside of the cycle
      expect(dependencyMap.has('b')).toBe(true);
      expect(dependencyMap.has('c')).toBe(true);
    });

    it('throws on cycles going back to the first dependency, if breakOnCycle true', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: undefined },
        d: { workspaceDependencies: ['a'] },
      };
      expect(() => walkWorkspaceRelations(workspaces, 'a', true)).toThrow();
    });

    it('throws on cycles in later descendants, if breakOnCycle true', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() => walkWorkspaceRelations(workspaces, 'a', true)).toThrow();
    });
  });
});
