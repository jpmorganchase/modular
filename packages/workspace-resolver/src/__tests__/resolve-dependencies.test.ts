import type {
  WorkspaceDependencyObject,
  WorkspaceMap,
} from '@modular-scripts/modular-types';

import {
  traverseWorkspaceRelations,
  invertDependencyDirection,
  computeAncestorSet,
  computeDescendantSet,
} from '../resolve-dependencies';

describe('resolve-dependencies', () => {
  describe('computeDescendantSet', () => {
    it('get a descendent set of a number of workspaces', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: [] },
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

    it('get a descendent set, ignoring cycles', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
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

    it('get a descendent set, ignoring cycles in with different DFS priorities', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: {
          workspaceDependencies: ['b'],
        },
        b: {
          workspaceDependencies: ['c', 'a'],
        },
        c: {
          workspaceDependencies: [],
        },
      };
      expect(computeDescendantSet(['a', 'b'], workspaces)).toEqual(
        new Set(['c']),
      );
      expect(computeDescendantSet(['b', 'c'], workspaces)).toEqual(
        new Set(['a']),
      );
    });

    it('can accept WorkspaceMap', () => {
      const workspaces: WorkspaceMap = {
        a: {
          workspaceDependencies: ['b', 'c'],
          location: '/a',
          mismatchedWorkspaceDependencies: [],
        },
        b: {
          workspaceDependencies: ['d'],
          location: '/b',
          mismatchedWorkspaceDependencies: [],
        },
        c: {
          workspaceDependencies: ['b'],
          location: '/c',
          mismatchedWorkspaceDependencies: [],
        },
        d: {
          workspaceDependencies: [],
          location: '/d',
          mismatchedWorkspaceDependencies: [],
        },
        e: {
          workspaceDependencies: ['a', 'b', 'c'],
          location: '/e',
          mismatchedWorkspaceDependencies: [],
        },
      };
      expect(computeDescendantSet(['a', 'b'], workspaces)).toEqual(
        new Set(['c', 'd']),
      );
    });
  });
  describe('computeAncestorSet', () => {
    it('get an ancestors set of a number of workspaces', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: [] },
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
  describe('invertDependencyDirection', () => {
    it('inverts descendants to ancestors', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: [] },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };

      expect(invertDependencyDirection(workspaces)).toEqual({
        a: { workspaceDependencies: ['e'] },
        b: { workspaceDependencies: ['a', 'c', 'e'] },
        c: { workspaceDependencies: ['a', 'e'] },
        d: { workspaceDependencies: ['b'] },
      });
    });
  });
  describe('walkWorkspaceRelations with a single workspace', () => {
    it('resolves descendants in order', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: [] },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(traverseWorkspaceRelations(['a'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(traverseWorkspaceRelations(['b'], workspaces)).toEqual(
        new Map([
          ['b', 0],
          ['d', 1],
        ]),
      );
      expect(traverseWorkspaceRelations(['c'], workspaces)).toEqual(
        new Map([
          ['c', 0],
          ['b', 1],
          ['d', 2],
        ]),
      );
      expect(traverseWorkspaceRelations(['d'], workspaces)).toEqual(
        new Map([['d', 0]]),
      );
      expect(traverseWorkspaceRelations(['e'], workspaces)).toEqual(
        new Map([
          ['e', 0],
          ['a', 1],
          ['b', 3],
          ['c', 2],
          ['d', 4],
        ]),
      );
    });

    it('resolves a walk with maximum length', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['d'] },
        d: { workspaceDependencies: ['e'] },
        e: { workspaceDependencies: [] },
      };

      expect(traverseWorkspaceRelations(['a'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['b', 1],
          ['c', 2],
          ['d', 3],
          ['e', 4],
        ]),
      );
    });

    it('resolves descendants in order and recognise tasks with the same order (parallel)', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['d'] },
        d: { workspaceDependencies: [] },
      };
      expect(traverseWorkspaceRelations(['a'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['c', 1],
          ['b', 1],
          ['d', 2],
        ]),
      );
    });

    it('catches a cycle going back to the first dependency', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: [] },
        d: { workspaceDependencies: ['a'] },
        e: { workspaceDependencies: ['d'] },
      };
      expect(() => traverseWorkspaceRelations(['a'], workspaces)).toThrow();
    });

    it('catches a cycle not going back to the first dependency', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() => traverseWorkspaceRelations(['a'], workspaces)).toThrow();
    });

    it('catches a cycle and two dependencies', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['a'] },
      };

      expect(() => traverseWorkspaceRelations(['a'], workspaces)).toThrow();
    });

    it('catches a cycle in later descendants', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() => traverseWorkspaceRelations(['a'], workspaces)).toThrow();
    });

    it("doesn't throw if a graph recurs back to an older node, but without a cycle", () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'd'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: [] },
        d: { workspaceDependencies: ['b'] },
      };
      expect(() => traverseWorkspaceRelations(['a'], workspaces)).not.toThrow();
      expect(traverseWorkspaceRelations(['a'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['c', 3],
          ['b', 2],
          ['d', 1],
        ]),
      );
    });

    it('Resolves correctly the case where there are no dependencies', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: [] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: [] },
        d: { workspaceDependencies: ['b'] },
      };
      expect(traverseWorkspaceRelations(['a'], workspaces)).toEqual(
        new Map([['a', 0]]),
      );
    });
  });

  describe('walkWorkspaceRelations with more than one workspace', () => {
    it('resolves descendants in order', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: ['b'] },
        d: { workspaceDependencies: [] },
        e: { workspaceDependencies: ['a', 'b', 'c'] },
      };
      expect(traverseWorkspaceRelations(['a', 'b'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['c', 1],
          ['b', 2],
          ['d', 3],
        ]),
      );
      expect(traverseWorkspaceRelations(['e', 'a'], workspaces)).toEqual(
        new Map([
          ['e', 0],
          ['a', 1],
          ['b', 3],
          ['c', 2],
          ['d', 4],
        ]),
      );
    });

    it('catches a cycle going back to the first dependency', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['d'] },
        c: { workspaceDependencies: [] },
        d: { workspaceDependencies: ['a'] },
        e: { workspaceDependencies: ['d'] },
      };
      expect(() =>
        traverseWorkspaceRelations(['a', 'e'], workspaces),
      ).toThrow();
    });

    it('catches a cycle not going back to the first dependency', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['b'] },
      };
      expect(() =>
        traverseWorkspaceRelations(['a', 'c'], workspaces),
      ).toThrow();
    });

    it('calculates correctly disjointed dependencies', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['d', 'e'] },
        d: { workspaceDependencies: ['e'] },
        e: { workspaceDependencies: [] },
        f: { workspaceDependencies: ['g'] },
        g: { workspaceDependencies: ['h', 'i'] },
        h: { workspaceDependencies: ['i'] },
        i: { workspaceDependencies: [] },
      };
      expect(traverseWorkspaceRelations(['a', 'f'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['b', 1],
          ['c', 2],
          ['d', 3],
          ['e', 4],
          ['f', 0],
          ['g', 1],
          ['h', 2],
          ['i', 3],
        ]),
      );
    });

    it('calculates correctly semi-disjointed dependencies', () => {
      const workspaces: Record<string, WorkspaceDependencyObject> = {
        a: { workspaceDependencies: ['b', 'c'] },
        b: { workspaceDependencies: ['c'] },
        c: { workspaceDependencies: ['d', 'e'] },
        d: { workspaceDependencies: ['e'] },
        e: { workspaceDependencies: [] },
        f: { workspaceDependencies: ['d', 'g'] },
        g: { workspaceDependencies: ['h', 'i'] },
        h: { workspaceDependencies: ['e', 'i'] },
        i: { workspaceDependencies: [] },
      };
      expect(traverseWorkspaceRelations(['a', 'f'], workspaces)).toEqual(
        new Map([
          ['a', 0],
          ['b', 1],
          ['c', 2],
          ['d', 3],
          ['e', 4],
          ['f', 0],
          ['g', 1],
          ['h', 2],
          ['i', 3],
        ]),
      );
    });
  });
});
