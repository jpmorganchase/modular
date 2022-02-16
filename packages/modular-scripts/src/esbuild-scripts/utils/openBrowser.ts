import chalk from 'chalk';
import { execSync } from 'child_process';
import spawn from 'cross-spawn';
import open from 'open';

import * as logger from '../../utils/logger';

// https://github.com/sindresorhus/open#app
const OSX_CHROME = 'google chrome';

enum Actions {
  NONE = 'None',
  BROWSER = 'Browser',
  SCRIPT = 'Script',
}

const DEFAULT_BROWSER = process.env.BROWSER || OSX_CHROME;
const DEFAULT_BROWSER_ARGS = process.env.BROWSER_ARGS
  ? process.env.BROWSER_ARGS.split(' ')
  : [];

// Will use the first open browser found from list
const SUPPORTED_CHROMIUM_BROWSERS = [
  'Google Chrome Canary',
  'Google Chrome',
  'Microsoft Edge',
  'Brave Browser',
  'Vivaldi',
  'Chromium',
];

function getBrowserEnv() {
  // Attempt to honor this environment variable.
  // It is specific to the operating system.
  // See https://github.com/sindresorhus/open#app for documentation.
  const value = DEFAULT_BROWSER;
  const args = DEFAULT_BROWSER_ARGS;
  let action;
  if (!value) {
    // Default.
    action = Actions.BROWSER;
  } else if (value.toLowerCase().endsWith('.js')) {
    action = Actions.SCRIPT;
  } else if (value.toLowerCase() === 'none') {
    action = Actions.NONE;
  } else {
    action = Actions.BROWSER;
  }
  // TODO remove
  console.log('OPENBROWSER - ESBUILD - getBrowserEnv', value, args);
  console.log({ action, value, args });
  // TODO /remove
  return { action, value, args };
}

function executeNodeScript(scriptPath: string, url: string) {
  const extraArgs = process.argv.slice(2);
  // TODO remove
  console.log('OPENBROWSER - ESBUILD - executeNodeScript');
  console.log(process.execPath, scriptPath, extraArgs);
  // TODO /remove
  const child = spawn(process.execPath, [scriptPath, ...extraArgs, url], {
    stdio: 'inherit',
  });
  child.on('close', (code: number) => {
    if (code !== 0) {
      logger.log();
      logger.log(
        chalk.red(
          'The script specified as BROWSER environment variable failed.',
        ),
      );
      logger.log(`${chalk.cyan(scriptPath)} exited with code ${code}.`);
      logger.log();
      return;
    }
  });
  return true;
}

async function startBrowserProcess(
  targetBrowser: string | undefined,
  url: string,
  args: string[],
) {
  // If we're on OS X, the user hasn't specifically
  // requested a different browser, we can try opening
  // Chrome with AppleScript. This lets us reuse an
  // existing tab when possible instead of creating a new one.
  const shouldTryOpenChromiumWithAppleScript =
    process.platform === 'darwin' && targetBrowser === OSX_CHROME;

  if (shouldTryOpenChromiumWithAppleScript) {
    for (const chromiumBrowser of SUPPORTED_CHROMIUM_BROWSERS) {
      try {
        // Try our best to reuse existing tab
        // on OSX Chromium-based browser with AppleScript
        execSync('ps cax | grep "' + chromiumBrowser + '"');
        execSync(
          'osascript openChrome.applescript "' +
            encodeURI(url) +
            '" "' +
            chromiumBrowser +
            '"',
          {
            cwd: __dirname,
            stdio: 'ignore',
          },
        );
        return true;
      } catch (err) {
        // Ignore errors.
      }
    }
  }

  // Another special case: on OS X, check if BROWSER has been set to "open".
  // In this case, instead of passing `open` to `opn` (which won't work),
  // just ignore it (thus ensuring the intended behavior, i.e. opening the system browser):
  // https://github.com/facebook/create-react-app/pull/1690#issuecomment-283518768
  if (process.platform === 'darwin' && targetBrowser === 'open') {
    targetBrowser = undefined;
  }

  // Fallback to open
  // (It will always open new tab)
  try {
    await open(url, {
      app: targetBrowser
        ? {
            name: targetBrowser,
            arguments: args,
          }
        : undefined,
      wait: false,
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Reads the BROWSER environment variable and decides what to do with it. Returns
 * true if it opened a browser or ran a node.js script, otherwise false.
 */
export default async function openBrowser(url: string): Promise<boolean> {
  const { action, value, args } = getBrowserEnv();
  switch (action) {
    case Actions.NONE:
      // Special case: BROWSER="none" will prevent opening completely.
      return false;
    case Actions.SCRIPT:
      return executeNodeScript(value, url);
    case Actions.BROWSER:
      return startBrowserProcess(value, url, args);
    default:
      throw new Error('Not implemented.');
  }
}
