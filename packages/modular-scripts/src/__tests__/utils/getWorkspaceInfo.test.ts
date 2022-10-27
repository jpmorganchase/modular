import { getWorkspaceInfo } from '../../utils/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  Object.values(workspace).forEach((pkg) => {
    expect(pkg).toMatchSnapshot({ version: expect.any(String) as unknown });
  });
});
