import {
  walkWorkspaceRelations,
  computeAncestorFromDescendants,
  computeAncestorSet,
  computeDescendantSet,
  LiteWorkSpaceRecord,
} from '..';

describe('@modular-scripts/dependency-resolver', () => {
  describe('computeDescendantSet', () => {
    it('get an descendent set of a number of workspaces', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: undefined },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(computeDescendantSet(['a', 'b'], workspaces)).toEqual(
        new Set(['c', 'd']),
      );
      expect(computeDescendantSet(['b', 'c'], workspaces)).toEqual(
        new Set(['d']),
      );
      expect(computeDescendantSet(['d'], workspaces)).toEqual(new Set());
    });
  });
  describe('computeAncestorSet', () => {
    it('get an ancestors set of a number of workspaces', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: undefined },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(computeAncestorSet(['d', 'b'], workspaces)).toEqual(
        new Set(['a', 'c', 'e']),
      );
      expect(computeAncestorSet(['a', 'c'], workspaces)).toEqual(
        new Set(['e']),
      );
      expect(computeAncestorSet(['e'], workspaces)).toEqual(new Set());
    });
  });
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
        a: { workspaceDependencies: ['e'] },
        b: { workspaceDependencies: ['a', 'c', 'e'] },
        c: { workspaceDependencies: ['a', 'e'] },
        d: { workspaceDependencies: ['b'] },
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
      expect(walkWorkspaceRelations('a', workspaces)).toEqual(
        new Map([
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(walkWorkspaceRelations('b', workspaces)).toEqual(
        new Map([['d', 1]]),
      );
      expect(walkWorkspaceRelations('c', workspaces)).toEqual(
        new Map([
          ['b', 1],
          ['d', 2],
        ]),
      );
      expect(walkWorkspaceRelations('d', workspaces)).toEqual(new Map());
      expect(walkWorkspaceRelations('e', workspaces)).toEqual(
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
      const dependencyMap = walkWorkspaceRelations('a', workspaces, false);
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
      const dependencyMap = walkWorkspaceRelations('a', workspaces, false);
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
      expect(() => walkWorkspaceRelations('a', workspaces, true)).toThrow();
    });

    it('throws on cycles in later descendants, if breakOnCycle true', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() => walkWorkspaceRelations('a', workspaces, true)).toThrow();
    });
  });
});
