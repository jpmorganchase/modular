import {
  createModularBuildConfig,
  createTestContext,
} from '../__fixtures__/create-test-context';
import { buildStandalone } from '../index';

describe('build', () => {
  let root: string;
  beforeEach(
    async () => (root = await createTestContext('micro-frontend-workspace')),
  );

  it('runs the build through esbuild', async () => {
    const config = createModularBuildConfig(root, 'card');
    const output = await buildStandalone(config, {
      USE_MODULAR_ESBUILD: 'true',
    });

    debugger;
  });
});
