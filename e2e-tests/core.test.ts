import * as path from 'path';
import * as fs from 'fs-extra';
import execa from 'execa';
import fkill from 'fkill';
import tmp from 'tmp';
import waitOn from 'wait-on';
import directoryTree from 'directory-tree';
import puppeteer from 'puppeteer';
import {
  getDocument,
  getQueriesForElement,
  waitFor,
  queries,
} from 'pptr-testing-library';
import detect from 'detect-port-alt';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getNodeText } = queries;

// These tests must be executed sequentially with `--runInBand`.
jest.setTimeout(10 * 60 * 1000);

const LOCAL_VERDACCIO_USER = 'testuser';
const LOCAL_VERDACCIO_PASSWORD = 'testpass';
const LOCAL_VERDACCIO_EMAIL = 'test@example.com';
const LOCAL_VERDACCIO_REGISTRY = 'http://localhost:4873';

async function startLocalRegistry(configPath: string): Promise<void> {
  await execa.command(
    `yarn verdaccio -l ${LOCAL_VERDACCIO_REGISTRY} -c ${configPath} &`,
    {
      shell: true,
      stdio: 'inherit',
    },
  );

  await waitOn({
    resources: [LOCAL_VERDACCIO_REGISTRY],
  });

  await execa(
    'yarn',
    [
      'npm-cli-login',
      '-u',
      LOCAL_VERDACCIO_USER,
      '-p',
      LOCAL_VERDACCIO_PASSWORD,
      '-e',
      LOCAL_VERDACCIO_EMAIL,
      '-r',
      LOCAL_VERDACCIO_REGISTRY,
    ],
    { stdio: 'inherit' },
  );
}

async function stopLocalRegistry() {
  await fkill('verdaccio', {
    force: true,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    silent: true,
  });
}

async function setupLocalRegistry(tmpDir: tmp.DirResult) {
  const gitStatus = (
    await execa('git', ['status', '--porcelain'])
  ).stdout.trim();

  if (gitStatus.length !== 0) {
    throw new Error(`
      Please commit your changes before running the E2E tests!
      Exiting because \`git status\` is not empty:

      ${gitStatus}
    `);
  }

  await fs.copyFile(
    path.join(__dirname, 'verdaccio.yaml'),
    path.join(tmpDir.name, 'verdaccio.yaml'),
  );

  await startLocalRegistry(path.join(tmpDir.name, 'verdaccio.yaml'));

  // Build and publish packages to the local registry.
  for (const packageName of [
    'cra-template-modular-typescript',
    'create-modular-react-app',
    'eslint-config-modular-app',
    'modular-scripts',
    'modular-template-widget-typescript',
  ]) {
    try {
      await execa('yarn', ['workspace', packageName, 'build']);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (error.stderr && error.stderr.includes('Command "build" not found.')) {
        console.debug(
          `No "build" script found for ${packageName}. Skipping...`,
        );
      } else {
        throw error;
      }
    }
    await execa(
      'yarn',
      [
        'workspace',
        packageName,
        'publish',
        '--registry',
        LOCAL_VERDACCIO_REGISTRY,
        '--no-git-tag-version',
        '--non-interactive',
        '--patch',
      ],
      { stdio: 'inherit' },
    );
  }
  await execa('git', ['reset', '--hard', 'HEAD'], { stdio: 'inherit' });
}

async function getBrowser() {
  return puppeteer.launch(
    process.env.CI
      ? {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      : {},
  );
}

interface DevServer {
  url: string;
  cancel: () => void;
}

async function startApp(appPath: string): Promise<DevServer> {
  // We `cancel` every dev server at the end of each test, but
  // for some reason the port is still in use at the beginning
  // of the next test.
  //
  // We avoid this by grabbing the next available port, making
  // sure that the next dev server is started using this, and
  // passing the correct URL to puppeteer.
  //
  // TODO: It would be a good idea to try to find out why
  // the port is still in use, and why the processes aren't
  // being killed. Currently, when the tests are containerised,
  // locally or on CI, we have to use `--forceExit` to ensure
  // Jest closes.
  //
  // See: https://github.com/jpmorganchase/modular/issues/54
  // See: https://github.com/jpmorganchase/modular/pull/45/files#r473007124
  const port = await detect(3000);

  const devServer = execa('yarn', ['start'], {
    cwd: appPath,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    env: {
      PORT: String(port),
    },
  });

  await new Promise((resolve, reject) => {
    if (!devServer.stdout) {
      return reject(
        new Error(
          'The dev server could not produce any output on /dev/stdout.',
        ),
      );
    }

    devServer.stdout.on('data', (data: Buffer) => {
      if (/Something is already running on port (\d+)./.test(data.toString())) {
        return reject(new Error(data.toString()));
      }
      if (/Compiled successfully!/.test(data.toString())) {
        return resolve();
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    devServer.on('error', (err: Error) => {
      reject(err);
    });
  });

  // We can't return the raw execa child process,
  // because we need to `await` until the dev server
  // starts above, but don't want to wait until the
  // process itself finishes.
  return {
    url: `http://localhost:${port}`,
    cancel() {
      return devServer.cancel();
    },
  };
}

function tree(rootPath: string) {
  function dropSizeAttributes(
    obj: directoryTree.DirectoryTree,
  ): directoryTree.DirectoryTree {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      JSON.stringify(obj, (k, v) => (k === 'size' ? undefined : v)),
    );
  }

  return dropSizeAttributes(
    directoryTree(rootPath, {
      exclude: [/\.git/, /node_modules/],
    }),
  );
}

let tmpDirectory: tmp.DirResult;
beforeAll(async () => {
  tmpDirectory = tmp.dirSync({ unsafeCleanup: true });
  await setupLocalRegistry(tmpDirectory);
  process.chdir(tmpDirectory.name);
});
afterAll(async () => {
  await stopLocalRegistry();
  tmpDirectory.removeCallback();
});

describe('when `yarn create modular-react-app [repo-name]` is executed', () => {
  const repoName = 'test-repo';
  const repoDirectory = path.join('.', repoName);

  beforeAll(async () => {
    await execa('yarn', ['create', 'modular-react-app', repoName], {
      cwd: tmpDirectory.name,
      // `npm_config_registry` is the only working way I could find
      // to change the registry of the `yarn create [starter-app]` command.
      // `YARN_REGISTRY` worked via the shell only.
      //
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      env: {
        YARN_REGISTRY: LOCAL_VERDACCIO_REGISTRY,
        npm_config_registry: LOCAL_VERDACCIO_REGISTRY,
      },
      stdio: 'inherit',
    });
    // We need to ensure that the starting `App.tsx` will render widgets.
    await fs.copyFile(
      path.join(__dirname, 'TestApp.test-tsx'),
      path.join(repoDirectory, 'app', 'src', 'App.tsx'),
    );
  });

  it('sets up the repo with the directory structure', () => {
    expect(tree(repoDirectory)).toMatchSnapshot();
  });

  it('sets up the repo with the contents', async () => {
    expect(await fs.readJson(path.join(repoDirectory, 'package.json')))
      .toMatchInlineSnapshot(`
        Object {
          "devDependencies": Object {
            "eslint-config-modular-app": "^0.0.1",
            "modular-scripts": "^0.0.2",
            "prettier": "^2.0.5",
          },
          "eslintConfig": Object {
            "extends": "modular-app",
          },
          "license": "MIT",
          "main": "index.js",
          "modular": Object {},
          "name": "test-repo",
          "prettier": Object {
            "printWidth": 80,
            "proseWrap": "always",
            "singleQuote": true,
            "trailingComma": "all",
          },
          "private": true,
          "scripts": Object {
            "build": "modular build",
            "lint": "eslint . --ext .js,.ts,.tsx",
            "prettier": "prettier --write .",
            "start": "modular start",
            "test": "modular test",
          },
          "version": "1.0.0",
          "workspaces": Array [
            "app",
            "widgets/*",
            "shared",
          ],
        }
      `);
    expect(await fs.readJson(path.join(repoDirectory, 'app', 'package.json')))
      .toMatchInlineSnapshot(`
        Object {
          "browserslist": Object {
            "development": Array [
              "last 1 chrome version",
              "last 1 firefox version",
              "last 1 safari version",
            ],
            "production": Array [
              ">0.2%",
              "not dead",
              "not op_mini all",
            ],
          },
          "dependencies": Object {
            "@testing-library/jest-dom": "^4.2.4",
            "@testing-library/react": "^9.5.0",
            "@testing-library/user-event": "^7.2.1",
            "@types/codegen.macro": "^3.0.0",
            "@types/jest": "^24.9.1",
            "@types/node": "^12.12.54",
            "@types/react": "^16.9.46",
            "@types/react-dom": "^16.9.8",
            "codegen.macro": "^4.0.0",
            "react": "^16.13.1",
            "react-dom": "^16.13.1",
            "react-scripts": "3.4.3",
          },
          "name": "app",
          "private": true,
          "version": "0.1.0",
        }
      `);
  });

  it('can start the app and see the lack of widgets', async () => {
    let browser: puppeteer.Browser | undefined;
    let devServer: DevServer | undefined;
    try {
      browser = await getBrowser();
      devServer = await startApp(repoDirectory);

      const page = await browser.newPage();
      await page.goto(devServer.url, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { getByTestId } = getQueriesForElement(await getDocument(page));

      await waitFor(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        () => getByTestId('widgets'),
      );

      // eslint-disable-next-line testing-library/no-await-sync-query
      expect(await getNodeText(await getByTestId('widgets'))).toBe(
        'No widgets found...',
      );
    } finally {
      if (browser) {
        await browser.close();
      }
      if (devServer) {
        devServer.cancel();
      }
    }
  });

  describe('when `yarn modular add [widget-name]` is executed', () => {
    beforeAll(async () => {
      const widgetName = 'widget-one';

      await execa('yarn', ['modular', 'add', widgetName], {
        cwd: repoDirectory,
        stdio: 'inherit',
      });
    });

    it('creates a widget with the directory structure', () => {
      expect(tree(repoDirectory)).toMatchSnapshot();
    });

    it('creates a widget with the contents', async () => {
      expect(
        await fs.readJson(
          path.join(repoDirectory, 'widgets', 'widget-one', 'package.json'),
        ),
      ).toMatchInlineSnapshot(`
          Object {
            "dependencies": Object {
              "react": "^16.13.1",
              "react-dom": "^16.13.1",
            },
            "devDependencies": Object {
              "@types/react": "^16.9.0",
              "@types/react-dom": "^16.9.0",
            },
            "license": "UNLICENSED",
            "main": "index.js",
            "name": "widget-one",
            "version": "1.0.0",
          }
        `);
      expect(
        await fs.readFile(
          path.join(repoDirectory, 'widgets', 'widget-one', 'index.tsx'),
          'utf8',
        ),
      ).toMatchInlineSnapshot(`
        "import * as React from 'react';

        export default function WidgetOne(): JSX.Element {
          return <div>This is WidgetOne</div>;
        }
        "
      `);
    });

    it('can start the app and show widget-one', async () => {
      let browser: puppeteer.Browser | undefined;
      let devServer: DevServer | undefined;
      try {
        browser = await getBrowser();
        devServer = await startApp(repoDirectory);

        const page = await browser.newPage();
        await page.goto(devServer.url);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        const { getByTestId, getByText } = getQueriesForElement(
          await getDocument(page),
        );

        // eslint-disable-next-line testing-library/no-await-sync-query
        expect(await getNodeText(await getByTestId('widgets'))).not.toBe(
          'No widgets found...',
        );

        await waitFor(
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          () => getByText('This is WidgetOne'),
        );

        // eslint-disable-next-line testing-library/no-await-sync-query
        expect(await getByText('This is WidgetOne')).toBeTruthy();
      } finally {
        if (browser) {
          await browser.close();
        }
        if (devServer) {
          devServer.cancel();
        }
      }
    });
  });
});
