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

  it('rejects packages not in the "packages" directory', async () => {
    mock(getModularRoot).mockReturnValue('__fixtures__/verify-workspace');

    const checked = await check('__fixtures__/verify-workspace');
    expect(checked).toBe(false);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        `package-four is not located within the "/packages" directory`,
      ),
    );
  });
});

function mock(input: unknown) {
  return input as jest.Mock;
}
