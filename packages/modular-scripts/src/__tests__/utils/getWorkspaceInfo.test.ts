import { getWorkspaceInfo } from '../../utils/getWorkspaceInfo';

test('getWorkspaceInfo', async () => {
  const workspace = await getWorkspaceInfo();
  Object.entries(workspace)
    .sort(([packageA], [packageB]) =>
      packageA < packageB ? -1 : packageA > packageB ? 1 : 0,
    )
    .forEach(([, pkg]) => {
      expect(pkg).toMatchSnapshot({ version: expect.any(String) as unknown });
    });
});
