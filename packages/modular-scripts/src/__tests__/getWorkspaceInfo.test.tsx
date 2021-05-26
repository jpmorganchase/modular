import { getWorkspaceInfo } from '../utils/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  expect(workspace).toMatchSnapshot();
});
