import { getWorkspaceInfo } from '../../utils/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  Object.entries(workspace).forEach(([_, workspaceRecord]) => {
    expect(typeof workspaceRecord.version).toBe('string');
  });
  expect(workspace).toMatchSnapshot();
});
