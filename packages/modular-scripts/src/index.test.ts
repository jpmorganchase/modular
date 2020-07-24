import { generateWidgetMap, getModularRoot } from './index';

test('exports public API', () => {
  expect(typeof generateWidgetMap).toBe('function');
  expect(typeof getModularRoot).toBe('function');
});
