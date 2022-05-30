import { partitionDependencies } from '../utils/filterDependencies';

describe('partitionDependencies', () => {
  describe('WHEN we specify an allow / block list', () => {
    it('THEN expects packages to be blocked / allowed by exact name with blocking winning in case of intersection', () => {
      const fakePkg = {
        fake1: '^2.0.1',
        fake2: '^1.0.1',
        fake3: '^3.12.5',
        fake4: '^4.5.36',
        fake5: '^0.0.1',
      };
      const allowList = ['fake1', 'fake2', 'fake3'];
      const blockList = ['fake2'];
      expect(
        partitionDependencies({
          packageDependencies: fakePkg,
          allowList,
          blockList,
        }),
      ).toEqual({
        bundled: {
          fake2: '^1.0.1',
          fake4: '^4.5.36',
          fake5: '^0.0.1',
        },
        external: {
          fake1: '^2.0.1',
          fake3: '^3.12.5',
        },
      });
    });
    it('THEN expects packages to be blocked / allowed by wildcard', () => {
      const fakePkg = {
        'fake1-typea': '^2.0.1',
        'fake2-typea': '^1.0.1',
        'fake3-typeb': '^3.12.5',
        'fake4-typeb': '^4.5.36',
        'fake5-typec': '^0.0.1',
      };
      const allowList = ['**'];
      const blockList = ['*-typeb'];
      expect(
        partitionDependencies({
          packageDependencies: fakePkg,
          allowList,
          blockList,
        }),
      ).toEqual({
        bundled: {
          'fake3-typeb': '^3.12.5',
          'fake4-typeb': '^4.5.36',
        },
        external: {
          'fake1-typea': '^2.0.1',
          'fake2-typea': '^1.0.1',
          'fake5-typec': '^0.0.1',
        },
      });
    });
    it('THEN expects scoped packages to be allowed by default', () => {
      const fakePkg = {
        '@somescope/fake1': '^2.0.1',
        '@somescope/fake2': '^1.0.1',
      };
      expect(
        partitionDependencies({
          packageDependencies: fakePkg,
        }),
      ).toEqual({
        bundled: {},
        external: {
          '@somescope/fake1': '^2.0.1',
          '@somescope/fake2': '^1.0.1',
        },
      });
    });
  });
});
