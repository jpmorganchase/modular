import execa from 'execa';
import stripAnsi from 'strip-ansi';
import * as fs from 'fs-extra';
import * as path from 'path';
import addPackage from './addPackage';
import {
  ModularPackageJson,
  isValidModularRootPackageJson,
} from './utils/isModularType';
import rimraf from 'rimraf';
import * as logger from './utils/logger';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { check } from './check';

function cleanGit(cwd: string): boolean {
  const trackedChanged = stripAnsi(
    execa.sync('git', ['status', '-s'], {
      all: true,
      reject: false,
      cwd,
      cleanup: true,
    }).stdout,
  );
  return trackedChanged.length === 0;
}

function resetChanges(): void {
  execa.sync('git', ['clean', '-fd']);
}

process.on('SIGINT', () => {
  logger.error(
    'Failed to convert your react app to a modular app cleanly. Reverting git changes...',
  );
  resetChanges();
});

export async function convert(cwd: string = process.cwd()): Promise<void> {
  if (!cleanGit(cwd)) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to convert this react app to modular app.',
    );
  }

  try {
    if (
      !isValidModularRootPackageJson(cwd) ||
      !fs.existsSync(path.join(cwd, 'packages'))
    ) {
      throw new Error(
        "You don't have a modular repo initialized. Run `yarn modular init -y` for a quick set up.",
      );
    }

    const rootPackageJson = (await fs.readJson(
      path.join(cwd, 'package.json'),
    )) as ModularPackageJson;

    const packageName = rootPackageJson.name as string;

    // Create a modular app for the current directory
    await addPackage(packageName, 'app', packageName);

    // Replace the template src and public folders with current react app folders
    const srcFolders = ['src', 'public'];
    srcFolders.forEach((dir: string) => {
      if (fs.existsSync(path.join(cwd, dir))) {
        rimraf.sync(path.join(cwd, 'packages', packageName, dir));
        fs.moveSync(
          path.join(cwd, dir),
          path.join(cwd, 'packages', packageName, dir),
        );
      }
    });

    execa.sync('yarnpkg', ['--silent'], { cwd });

    await check();
  } catch (err) {
    logger.error(
      'Failed to convert your react app to a modular app cleanly. Reverting git changes...',
    );
    resetChanges();
    throw err;
  }
}

export default actionPreflightCheck(convert);
