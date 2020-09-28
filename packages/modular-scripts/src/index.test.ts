import { generateViewMap, getModularRoot } from './index';

test('exports public API', () => {
  expect(typeof generateViewMap).toBe('function');
  expect(typeof getModularRoot).toBe('function');
});
