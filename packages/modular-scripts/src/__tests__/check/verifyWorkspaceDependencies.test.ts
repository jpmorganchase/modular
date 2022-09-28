import { check } from '../../check/verifyWorkspaceDependencies';
import getModularRoot from '../../utils/getModularRoot';
import { error } from '../../utils/logger';

jest.mock('../../utils/getModularRoot', () => jest.fn());
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('verifyWorkspaceDependencies', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('checks a valid workspace', async () => {
    mock(getModularRoot).mockReturnValue(
      '__fixtures__/resolve-workspace/clean-workspace-1',
    );

    expect(await check()).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  it('doesn\'t reject packages not in the "packages" directory', async () => {
    mock(getModularRoot).mockReturnValue('__fixtures__/verifiable-project');

    const checked = await check('__fixtures__/verifiable-project');
    expect(checked).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });
});

function mock(input: unknown) {
  return input as jest.Mock;
}
