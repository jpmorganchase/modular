import React from 'react';
import path from 'path';
import { spawn } from 'child_process';
import { render, screen } from '@testing-library/react';

import { RemoteViewExample } from './RemoteViewExample';

const controller = new AbortController();

// Launch a tiny fake ESM cdn
// See serve.js
function bootFakeEsmCdn() {
  return new Promise((res) => {
    const serverPath = path.join(__dirname, 'serve.js');
    const server = spawn('node', [serverPath], {
      signal: controller.signal,
    });
    // Resolve the promise when the server has finished booting
    server.stdout.on('data', function (data: Buffer) {
      if (data.toString().includes('launched on port 8484')) {
        res(true);
      }
    });
    server.unref();
  });
}

describe('remote-view', () => {
  beforeAll(async () => {
    await bootFakeEsmCdn();
  });

  afterAll(() => {
    // Terminate the fake ESM CDN after tests have run
    controller.abort();
  });

  // TODO
  // Render some <RemoteView />s
  // The remote views should load (at least 2) and render
  // The iframe fallback would work

  it('should work', async () => {
    // const content = await fetch(
    //   'http://localhost:8484/esm-view-card/package.json',
    // );
    // console.log('fetched this content', content);
    expect(1 + 1).toBe(2);

    render(<RemoteViewExample />);
    await screen.findByText('My List');
  });
});
