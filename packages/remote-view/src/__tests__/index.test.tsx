/* eslint-disable testing-library/prefer-screen-queries */

import path from 'path';
import puppeteer from 'puppeteer';
import { getDocument, queries, waitFor } from 'pptr-testing-library';
import { spawn } from 'child_process';

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
  let browser: puppeteer.Browser;

  beforeAll(async () => {
    await bootFakeEsmCdn();

    const launchArgs: puppeteer.LaunchOptions &
      puppeteer.BrowserLaunchArgumentOptions = {
      // always run in headless - if you want to debug this locally use the env var to
      headless: !Boolean(process.env.NO_HEADLESS_TESTS),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    browser = await puppeteer.launch(launchArgs);
  });

  afterAll(async () => {
    // Terminate the fake ESM CDN after tests have run
    controller.abort();

    // Terminate the puppeteer browser
    if (browser) {
      await browser.close();
    }
  });

  // TODO
  // This is working, but is an integration test (so 0 coverage)
  // Next steps:
  // - Add checks of the list component to this
  // - Add another test, that mocks out the import bit (move to a fn, probably)
  // - Update the contributing docs after moving stuff into `remote-view-fake-cdn`
  // - Address PR TODOs
  // That will allow high unit test coverage, plus a deep integration test

  it('should render the example remote view and work', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:8484/index.html', {});

    // 1. The card should render with it's default content
    const $document = await getDocument(page);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    await waitFor(() => queries.findByText($document, 'Some card contents'));

    const $button = await queries.findByText($document, 'Change card content');
    // eslint-disable-next-line jest-dom/prefer-in-document
    expect($button).toBeTruthy();

    // 2. Clicking the button should work
    const buttonSelector = 'button';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);

    const $updated = await queries.findByText(
      $document,
      'Some mutated card contents',
    );
    // eslint-disable-next-line jest-dom/prefer-in-document
    expect($updated).toBeTruthy();

    // 3. React & ReactDOM still work, the content of the remote view got updated
    const contentSelector = 'span';
    const updatedContentSelector = await page.waitForSelector(contentSelector);
    const updatedContent = await updatedContentSelector?.evaluate(
      (el) => el.textContent,
    );
    expect(updatedContent).toBe('Some mutated card contents');

    // TODO other view
  });
});
