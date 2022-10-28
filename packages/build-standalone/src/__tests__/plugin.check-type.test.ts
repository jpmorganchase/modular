import { mockBuildConfig } from '../__fixtures__/build-config';
import { checkType } from '../plugins/check-type';
import type { ModularBuildConfig } from '../types';

describe('plugin.checkType', () => {
  it('throws', () => {
    const plugin = checkType(
      mockBuildConfig({ type: 'app' }),
      'esm-view',
      'package',
    );
    expect(plugin.handler).toThrow('checkType(app) not a permitted type');
  });

  it('permits', () => {
    const plugin = checkType(
      { type: 'app' } as ModularBuildConfig,
      'esm-view',
      'app',
    );
    expect(plugin.handler).not.toThrow();
  });

  it('passes through context unchanged', () => {
    const context = {};
    const plugin = checkType<typeof context>(
      { type: 'esm-view' } as ModularBuildConfig,
      'esm-view',
    );
    expect(plugin.handler(Object.freeze(context))).toBe(context);
  });
});
