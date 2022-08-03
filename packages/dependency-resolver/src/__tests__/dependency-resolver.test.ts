import {
  traverseWorkspaceRelations,
  computeAncestorFromDescendants,
  computeAncestorSet,
  computeDescendantSet,
  LiteWorkSpaceRecord,
} from '..';

describe('@modular-scripts/dependency-resolver', () => {
  describe('computeDescendantSet', () => {
    it('get a descendent set of a number of workspaces', () => {
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
    it('get a descendent set, breaking on cycles', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['a'] },
      };
      expect(() =>
        computeDescendantSet(['a', 'b'], workspaces, true),
      ).toThrow();
      expect(() =>
        computeDescendantSet(['b', 'c'], workspaces, true),
      ).toThrow();
    });

    it('get a descendent set, ignoring cycles', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['a'] },
      };
      expect(computeDescendantSet(['a', 'b'], workspaces)).toEqual(
        new Set(['c']),
      );
      expect(computeDescendantSet(['b', 'c'], workspaces)).toEqual(
        new Set(['a']),
      );
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
      expect(traverseWorkspaceRelations('a', workspaces)).toEqual(
        new Map([
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(traverseWorkspaceRelations('b', workspaces)).toEqual(
        new Map([['d', 1]]),
      );
      expect(traverseWorkspaceRelations('c', workspaces)).toEqual(
        new Map([
          ['b', 1],
          ['d', 2],
        ]),
      );
      expect(traverseWorkspaceRelations('d', workspaces)).toEqual(new Map());
      expect(traverseWorkspaceRelations('e', workspaces)).toEqual(
        new Map([
          ['a', 1],
          ['b', 3],
          ['c', 2],
          ['d', 4],
        ]),
      );
    });

    it('resolves descendants in order and recognise tasks with the same order (parallel)', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['d'] },
        d: { workspaceDependencies: undefined },
      };
      expect(traverseWorkspaceRelations('a', workspaces)).toEqual(
        new Map([
          ['c', 1],
          ['b', 1],
          ['d', 2],
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
      const dependencyMap = traverseWorkspaceRelations('a', workspaces, false);
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
      const dependencyMap = traverseWorkspaceRelations('a', workspaces, false);
      expect(dependencyMap.has('a')).toBe(false); // The original dependency is not there, because it's outside of the cycle
      expect(dependencyMap.has('b')).toBe(true);
      expect(dependencyMap.has('c')).toBe(true);
    });

    it('resolves descendants in some (unreliable) order with a cycle and two dependencies', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['a'] },
      };

      const dependencyMap = traverseWorkspaceRelations('a', workspaces, false);
      expect(dependencyMap.has('a')).toBe(true);
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
      expect(() => traverseWorkspaceRelations('a', workspaces, true)).toThrow();
    });

    it('throws on cycles in later descendants, if breakOnCycle true', () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() => traverseWorkspaceRelations('a', workspaces, true)).toThrow();
    });

    it("doesn't throw if a graph recurs back to an older node, but without a cycle", () => {
      const workspaces: Record<string, LiteWorkSpaceRecord> = {
        a: { workspaceDependencies: ['b', 'd'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: undefined },
        d: { workspaceDependencies: ['b'] },
      };
      expect(() =>
        traverseWorkspaceRelations('a', workspaces, true),
      ).not.toThrow();
      expect(traverseWorkspaceRelations('a', workspaces, true)).toEqual(
        new Map([
          ['c', 3],
          ['b', 2],
          ['d', 1],
        ]),
      );
    });
  });
});
