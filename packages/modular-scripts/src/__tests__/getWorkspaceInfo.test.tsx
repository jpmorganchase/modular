import { getWorkspaceInfo } from '../commands/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  expect(workspace).toMatchSnapshot();
});
