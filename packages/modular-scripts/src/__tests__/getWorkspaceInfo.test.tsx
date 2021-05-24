import { getWorkspaceInfo } from '../getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  expect(workspace).toMatchSnapshot();
});
