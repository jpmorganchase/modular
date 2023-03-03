import { getWorkspaceInfo } from '../../utils/getWorkspaceInfo';

import type { WorkspaceInfo } from '../../utils/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const collected: WorkspaceInfo = {};
  const workspace = await getWorkspaceInfo();

  // Check that a version string exists but, exclude the version
  // from the snapshot comparison, to avoid intefering when version bumping happens
  Object.entries(workspace).forEach(([key, workspaceRecord]) => {
    const { version, ...record } = workspaceRecord;
    expect(typeof version).toBe('string');
    collected[key] = { ...record };
  });

  expect(collected).toMatchSnapshot();
});
