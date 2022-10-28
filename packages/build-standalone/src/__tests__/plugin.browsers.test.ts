import browserslist from 'browserslist';

import { mockBuildConfig } from '../__fixtures__/build-config';
import { checkBrowsers } from '../plugins/check-browsers';

jest.mock('browserslist', () => ({
  loadConfig: jest.fn(),
}));

describe('plugin.checkBrowsers', () => {
  const plugin = checkBrowsers(
    mockBuildConfig({
      targetDirectory: '/foo/bar',
    }),
  );
  const { loadConfig } = browserslist as unknown as { loadConfig: jest.Mock };

  afterEach(() => jest.resetAllMocks());

  it('throws', () => {
    loadConfig.mockReturnValue(null);
    expect(plugin.handler).toThrow(
      'Modular requires that you specify targeted browsers',
    );
  });

  it('permits', () => {
    expect(plugin.handler).not.toThrow();
  });

  it('passes through context unchanged', () => {
    const context = {};
    expect(plugin.handler(Object.freeze(context))).toBe(context);
  });
});
