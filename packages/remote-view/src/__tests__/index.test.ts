// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RemoteViewProvider, RemoteView } from '../components';

describe('remote-view', () => {
  beforeAll(() => {
    console.log('todo set up remote views');
    // TODO serve the 2x static output in __fixtures__/remote-view/output
  });

  // Render some <RemoteView />s
  // The remote views should load (at least 2) and render
  // The iframe fallback would work

  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
