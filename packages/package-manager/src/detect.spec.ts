import {
  createTestContext,
  ITestContext,
  workspace,
} from '@modular-scripts/test-utils/src';
import { detect } from './detect';

describe('detect', function () {
  let context: ITestContext;

  beforeEach(async () => (context = await createTestContext()));

  it('detects yarn by detail in the package.json', () => {
    expect('goodbye').not.toBe('hello');
  });

  it('detects yarn by its lockfile', async () => {
    await workspace(context).yarn();

    expect(await detect(context.root)).toBe('yarn1');
  });

  it('detects npm by its lockfile', async () => {
    await workspace(context).npm();

    expect(await detect(context.root)).toBe('npm');
  });
});
