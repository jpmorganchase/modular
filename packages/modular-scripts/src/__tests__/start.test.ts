/**
 * @jest-environment jsdom
 */

/* eslint-disable testing-library/prefer-screen-queries */

import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { getDocument, queries, waitFor } from 'pptr-testing-library';
import puppeteer from 'puppeteer';

import { startApp, DevServer } from './start-app';
import {
  addPackageForTests,
  createModularTestContext,
  setupMocks,
} from '../test/utils';

// Temporary text context paths
let tempModularRepo: string;

// These tests must be executed sequentially with `--runInBand`.
const targetedView = 'sample-app';

describe('modular start', () => {
  beforeAll(async () => {
    tempModularRepo = createModularTestContext();
    setupMocks(tempModularRepo);
    const tempPackagesPath = path.join(tempModularRepo, 'packages');

    await addPackageForTests('sample-app', 'app');

    await fs.copyFile(
      path.join(__dirname, 'TestApp.test-tsx'),
      path.join(tempPackagesPath, targetedView, 'src', 'App.tsx'),
    );
  });

  describe('when starting an app in esbuild mode', () => {
    let browser: puppeteer.Browser;
    let devServer: DevServer;
    let port: string;

    beforeAll(async () => {
      const launchArgs: puppeteer.LaunchOptions &
        puppeteer.BrowserLaunchArgumentOptions = {
        // always run in headless - if you want to debug this locally use the env var to
        headless: !Boolean(process.env.NO_HEADLESS_TESTS),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--allow-insecure-localhost',
        ],
      };

      browser = await puppeteer.launch(launchArgs);
      port = '4000';
      devServer = await startApp(
        targetedView,
        {
          env: { PORT: port, USE_MODULAR_ESBUILD: 'true', HTTPS: 'true' },
        },
        tempModularRepo,
      );
    });

    afterAll(async () => {
      if (browser) {
        await browser.close();
      }
      if (devServer) {
        // this is the problematic bit, it leaves hanging node processes
        // despite closing the parent process. Only happens in tests!
        void devServer.kill();
      }
      if (port) {
        // kill all processes listening to the dev server port
        exec(
          `lsof -n -i4TCP:${port} | grep LISTEN | awk '{ print $2 }' | xargs kill -9`,
        );
      }
    });

    it('successfully starts up using https', async () => {
      const page = await browser.newPage();
      await page.goto(`https://localhost:${port}`, {});

      const $document = await getDocument(page);

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await waitFor(() => queries.findByTestId($document, 'test-this'));

      const $text = await queries.findByText(
        $document,
        'this is a modular app',
      );
      // eslint-disable-next-line jest-dom/prefer-in-document
      expect($text).toBeTruthy();
    });
  });
});
